<?php

namespace App\Data;

final readonly class IpcMonth
{
    public const FORMAT = 'Y-m';

    public function __construct(
        public string $month,
        public string $variation,
    ) {}

    /**
     * @param  array{month: string, variation: string}  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(...$data);
    }

    /**
     * @return array{month: string, variation: string}
     */
    public function toArray(): array
    {
        return get_object_vars($this);
    }
}
