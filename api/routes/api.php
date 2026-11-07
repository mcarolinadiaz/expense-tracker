<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\SummaryController;
use App\Http\Controllers\Api\IpcController;

Route::middleware('throttle:5,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::get('/ipc', IpcController::class)->middleware('throttle:'.IpcController::RATE_LIMITER);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn (Request $request) => $request->user());
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::apiResource('categories', CategoryController::class)->except('show');
    Route::apiResource('transactions', TransactionController::class);
    Route::get('/summary', SummaryController::class);
});