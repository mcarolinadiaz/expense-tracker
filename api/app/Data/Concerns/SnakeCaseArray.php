<?php

namespace App\Data\Concerns;

use Illuminate\Support\Str;

trait SnakeCaseArray
{
    /**
     * The object's properties as an array with snake_case keys, as the rest of the API uses.
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
