<?php

use App\Http\Controllers\Api\IpcController;
use App\Http\Controllers\Api\IpcFactorsController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:'.IpcController::RATE_LIMITER)->group(function () {
    Route::get('/ipc', IpcController::class);
    Route::get('/ipc/factors', IpcFactorsController::class);
});
