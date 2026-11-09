<?php

namespace App\Http\Resources;

use App\Data\IpcFactor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin IpcFactor
 */
class IpcFactorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return $this->resource->toArray();
    }
}
