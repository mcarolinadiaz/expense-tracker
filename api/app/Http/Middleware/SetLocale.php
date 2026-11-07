<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    private const SUPPORTED_LOCALES_CONFIG = 'app.supported_locales';

    public function handle(Request $request, Closure $next): Response
    {
        App::setLocale($request->getPreferredLanguage(config(self::SUPPORTED_LOCALES_CONFIG)));

        return $next($request);
    }
}
