<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'series' => [
        // Keys match the constructor of App\Services\SeriesSettings, which receives this array as named arguments.
        'url' => env('SERIES_API_URL', 'https://apis.datos.gob.ar/series/api'),
        'ipcId' => env('SERIES_IPC_ID', '148.3_INIVELNAL_DICI_M_26'),
        'ipcSource' => 'INDEC',
        'startDate' => env('SERIES_START_DATE', '2017-01-01'),
        'timeoutSeconds' => (int) env('SERIES_TIMEOUT_SECONDS', 10),
        'retries' => (int) env('SERIES_RETRIES', 2),
        'retryDelayMs' => (int) env('SERIES_RETRY_DELAY_MS', 500),
        'cacheHours' => (int) env('SERIES_CACHE_HOURS', 12),
        'rateLimitPerMinute' => (int) env('SERIES_RATE_LIMIT_PER_MINUTE', 60),
    ],

];
