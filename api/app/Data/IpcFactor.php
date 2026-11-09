<?php

namespace App\Data;

use App\Data\Concerns\SnakeCaseArray;

final readonly class IpcFactor
{
    use SnakeCaseArray;

    public function __construct(
        public string $month,
        public string $factor,
        public bool $increases,
        public bool $estimated,
    ) {}
}
