<?php

namespace App\Data;

use Illuminate\Support\Str;

final readonly class IpcMeta
{
    public function __construct(
        public ?string $lastMonth,
        public string $source,
    ) {}

    /**
     * Uses snake_case keys, as the rest of the API does, such as 'last_month'.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return collect(get_object_vars($this))
            ->mapWithKeys(fn (mixed $value, string $key) => [Str::snake($key) => $value])
            ->all();
    }
}
