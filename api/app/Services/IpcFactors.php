<?php

namespace App\Services;

use App\Data\IpcFactor;
use App\Data\IpcFactorsQuery;
use App\Data\IpcMonth;
use App\Data\IpcProjection;
use App\Enums\IpcEstimate;
use Illuminate\Support\Carbon;

class IpcFactors
{
    private const PRECISION = 10;

    private const FACTOR_DECIMALS = 4;

    private const RATE_DECIMALS = 2;

    private const PERCENT_BASE = '100';

    private const NO_CHANGE = '1';

    private const NOTHING = '0';

    private const MONTHS_PER_YEAR = 12;

    public function __construct(private readonly IpcSeries $series) {}

    /**
     * Cumulative adjustment factors for a cost whose current amount applies in $query->from,
     * and that increases every $query->every months by the IPC of the months since its last increase.
     */
    public function project(IpcFactorsQuery $query): IpcProjection
    {
        $real = collect($this->series->monthly())
            ->mapWithKeys(fn (IpcMonth $month) => [$month->month => $month->variation]);
        $monthlyEstimate = $this->monthlyEstimate($query, $real->values()->all());

        $start = $this->month($query->from);
        $lastIncrease = $this->month($query->lastIncrease);
        $factor = self::NO_CHANGE;
        $estimated = false;
        $factors = [];

        for ($offset = 0; $offset < $query->months; $offset++) {
            $month = $start->copy()->addMonthsNoOverflow($offset);
            $sinceIncrease = $this->index($month) - $this->index($lastIncrease);
            $increases = $offset > 0 && $sinceIncrease % $query->every === 0;

            if ($increases) {
                for ($back = $query->every; $back > 0; $back--) {
                    $rate = $real->get($month->copy()->subMonthsNoOverflow($back)->format(IpcMonth::FORMAT));
                    $estimated = $estimated || $rate === null;
                    $factor = bcmul($factor, $this->multiplier($rate ?? $monthlyEstimate), self::PRECISION);
                }
            }

            $factors[] = new IpcFactor(
                month: $month->format(IpcMonth::FORMAT),
                factor: bcround($factor, self::FACTOR_DECIMALS),
                increases: $increases,
                estimated: $estimated,
            );
        }

        return new IpcProjection($factors, $monthlyEstimate);
    }

    /**
     * @param  array<int, string>  $variations  Official monthly variations, oldest first.
     */
    private function monthlyEstimate(IpcFactorsQuery $query, array $variations): string
    {
        if ($query->estimate === IpcEstimate::Custom) {
            return bcround($query->rate, self::RATE_DECIMALS);
        }

        $recent = array_slice($variations, -$query->averageMonths);
        $total = array_reduce($recent, fn (string $sum, string $rate) => bcadd($sum, $rate, self::PRECISION), self::NOTHING);

        return bcround(bcdiv($total, (string) count($recent), self::PRECISION), self::RATE_DECIMALS);
    }

    private function multiplier(string $rate): string
    {
        return bcdiv(bcadd(self::PERCENT_BASE, $rate, self::PRECISION), self::PERCENT_BASE, self::PRECISION);
    }

    private function month(string $month): Carbon
    {
        return Carbon::createFromFormat('!'.IpcMonth::FORMAT, $month);
    }

    private function index(Carbon $month): int
    {
        return $month->year * self::MONTHS_PER_YEAR + $month->month;
    }
}
