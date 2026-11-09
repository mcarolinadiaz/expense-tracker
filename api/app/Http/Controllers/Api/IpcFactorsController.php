<?php

namespace App\Http\Controllers\Api;

use App\Data\IpcFactorsMeta;
use App\Http\Controllers\Controller;
use App\Http\Requests\IpcFactorsRequest;
use App\Http\Resources\IpcFactorCollection;
use App\Services\IpcFactors;
use App\Services\IpcSeries;

class IpcFactorsController extends Controller
{
    public function __invoke(IpcFactorsRequest $request, IpcFactors $factors, IpcSeries $series)
    {
        $query = $request->toQuery();
        $projection = $factors->project($query);

        return new IpcFactorCollection($projection->factors, new IpcFactorsMeta(
            lastMonth: collect($series->monthly())->last()?->month,
            estimate: $query->estimate->value,
            monthlyEstimate: $projection->monthlyEstimate,
            source: $series->source(),
        ));
    }
}
