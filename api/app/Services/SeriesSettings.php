<?php

namespace App\Services;

final readonly class SeriesSettings
{
    private const CONFIG_KEY = 'services.series';

    public function __construct(
        public string $url,
        public string $ipcId,
        public string $ipcSource,
        public string $startDate,
        public int $timeoutSeconds,
        public int $retries,
        public int $retryDelayMs,
        public int $cacheHours,
        public int $rateLimitPerMinute,
    ) {}

    public static function fromConfig(): self
    {
        return new self(...config(self::CONFIG_KEY));
    }
}
