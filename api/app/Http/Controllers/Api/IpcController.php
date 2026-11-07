<?php

namespace App\Http\Controllers\Api;

use App\Data\IpcMeta;
use App\Data\IpcMonth;
use App\Http\Controllers\Controller;
use App\Http\Requests\IpcRequest;
use App\Http\Resources\IpcMonthCollection;
use App\Services\IpcSeries;

class IpcController extends Controller
{
    public const RATE_LIMITER = 'ipc';

    public function __invoke(IpcRequest $request, IpcSeries $ipc)
    {
        $all = collect($ipc->monthly());

        $months = $all
            ->when($request->from(), fn ($months, $from) => $months->filter(fn (IpcMonth $m) => $m->month >= $from))
            ->when($request->to(), fn ($months, $to) => $months->filter(fn (IpcMonth $m) => $m->month <= $to))
            ->values();

        return new IpcMonthCollection($months, new IpcMeta(
            lastMonth: $all->last()?->month,
            source: $ipc->source(),
        ));
    }
}
