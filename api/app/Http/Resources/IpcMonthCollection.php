<?php

namespace App\Http\Resources;

use App\Data\IpcMeta;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class IpcMonthCollection extends ResourceCollection
{
    private const META = 'meta';

    public $collects = IpcMonthResource::class;

    public function __construct(mixed $resource, private readonly IpcMeta $meta)
    {
        parent::__construct($resource);
    }

    public function with(Request $request): array
    {
        return [self::META => $this->meta->toArray()];
    }
}
