<?php

namespace App\Data;

use App\Enums\IpcEstimate;

final readonly class IpcFactorsQuery
{
    public function __construct(
        public string $from,
        public int $months,
        public int $every,
        public string $lastIncrease,
        public IpcEstimate $estimate,
        public ?string $rate,
        public int $averageMonths,
    ) {}
}
