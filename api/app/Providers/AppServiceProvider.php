<?php

namespace App\Providers;

use App\Http\Controllers\Api\IpcController;
use App\Services\SeriesSettings;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(SeriesSettings::class, fn () => SeriesSettings::fromConfig());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for(IpcController::RATE_LIMITER, fn (Request $request) => Limit::perMinute(
            $this->app->make(SeriesSettings::class)->rateLimitPerMinute,
        )->by($request->ip()));
    }
}
