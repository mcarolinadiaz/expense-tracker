<?php

namespace App\Data;

use App\Data\Concerns\SnakeCaseArray;

final readonly class IpcMeta
{
    use SnakeCaseArray;

    public function __construct(
        public ?string $lastMonth,
        public string $source,
    ) {}
}
