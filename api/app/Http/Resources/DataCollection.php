<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

/**
 * A collection response with a 'meta' object built from a data object that has toArray().
 */
abstract class DataCollection extends ResourceCollection
{
    private const META = 'meta';

    public function __construct(mixed $resource, private readonly object $meta)
    {
        parent::__construct($resource);
    }

    public function with(Request $request): array
    {
        return [self::META => $this->meta->toArray()];
    }
}
