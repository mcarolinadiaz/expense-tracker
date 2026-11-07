<?php

namespace App\Http\Resources;

use App\Data\IpcMonth;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin IpcMonth
 */
class IpcMonthResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return $this->resource->toArray();
    }
}
