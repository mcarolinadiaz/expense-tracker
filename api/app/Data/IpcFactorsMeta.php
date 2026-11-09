<?php

namespace App\Data;

use App\Data\Concerns\SnakeCaseArray;

final readonly class IpcFactorsMeta
{
    use SnakeCaseArray;

    public function __construct(
        public ?string $lastMonth,
        public string $estimate,
        public string $monthlyEstimate,
        public string $source,
    ) {}
}
