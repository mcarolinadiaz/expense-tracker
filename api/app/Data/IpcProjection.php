<?php

namespace App\Data;

final readonly class IpcProjection
{
    /**
     * @param  array<int, IpcFactor>  $factors
     */
    public function __construct(
        public array $factors,
        public string $monthlyEstimate,
    ) {}
}
