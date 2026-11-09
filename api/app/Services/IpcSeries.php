<?php

namespace App\Services;

use App\Data\IpcMonth;
use App\Exceptions\IpcUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class IpcSeries
{
    public const CACHE_KEY = 'ipc.monthly';

    public const LAST_KNOWN_CACHE_KEY = 'ipc.monthly.last_known';

    private const ENDPOINT = 'series/';

    private const SERIES_PARAMETER = 'ids';

    private const START_DATE_PARAMETER = 'start_date';

    private const QUERY = [
        'format' => 'json',
        'limit' => 1000,
    ];

    private const RESPONSE_ROWS = 'data';

    private const PRECISION = 10;

    private const VARIATION_DECIMALS = 2;

    private const PERCENT_BASE = '100';

    private const INDEX_FORMAT = '%.6F';

    public function __construct(private readonly SeriesSettings $settings) {}

    public function monthly(): array
    {
        $months = Cache::get(self::CACHE_KEY) ?? $this->refresh();

        return array_map(IpcMonth::fromArray(...), $months);
    }

    public function source(): string
    {
        return $this->settings->ipcSource;
    }

    /**
     * Fetches the official data and caches it. If the source fails, it serves the last data it
     * fetched, and waits a while before trying again, so every request doesn't wait for the timeout.
     *
     * The cache stores plain arrays, because it doesn't rebuild objects when it reads them.
     *
     * @return array<int, array{month: string, variation: string}>
     */
    private function refresh(): array
    {
        try {
            $months = array_map(fn (IpcMonth $month) => $month->toArray(), $this->fetch());
        } catch (IpcUnavailableException $e) {
            $lastKnown = Cache::get(self::LAST_KNOWN_CACHE_KEY) ?? throw $e;

            report($e);
            Cache::put(self::CACHE_KEY, $lastKnown, now()->addMinutes($this->settings->retryAfterMinutes));

            return $lastKnown;
        }

        Cache::put(self::CACHE_KEY, $months, now()->addHours($this->settings->cacheHours));
        Cache::forever(self::LAST_KNOWN_CACHE_KEY, $months);

        return $months;
    }

    /**
     * @return array<int, IpcMonth>
     */
    private function fetch(): array
    {
        try {
            $rows = Http::baseUrl($this->settings->url)
                ->acceptJson()
                ->timeout($this->settings->timeoutSeconds)
                ->retry($this->settings->retries, $this->settings->retryDelayMs)
                ->get(self::ENDPOINT, [
                    self::SERIES_PARAMETER => $this->settings->ipcId,
                    self::START_DATE_PARAMETER => $this->settings->startDate,
                    ...self::QUERY,
                ])
                ->json(self::RESPONSE_ROWS);
        } catch (ConnectionException|RequestException $e) {
            throw new IpcUnavailableException(previous: $e);
        }

        $months = [];
        $previous = null;

        foreach ($rows as [$date, $index]) {
            if ($index === null) {
                $previous = null;

                continue;
            }

            $current = sprintf(self::INDEX_FORMAT, $index);

            if ($previous !== null) {
                $change = bcdiv(bcsub($current, $previous, self::PRECISION), $previous, self::PRECISION);
                $percent = bcmul($change, self::PERCENT_BASE, self::PRECISION);

                $months[] = new IpcMonth(
                    month: Carbon::parse($date)->format(IpcMonth::FORMAT),
                    variation: bcround($percent, self::VARIATION_DECIMALS),
                );
            }

            $previous = $current;
        }

        return $months;
    }
}
