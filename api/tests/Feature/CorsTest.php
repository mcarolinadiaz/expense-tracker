<?php

use App\Services\SeriesSettings;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake([app(SeriesSettings::class)->url.'/*' => Http::response(['data' => [['2026-07-01', 100.0], ['2026-08-01', 101.0]]])]);
    config(['cors.allowed_origins' => ['https://app.example.com']]);
});

test('an allowed origin can read the API from a browser', function () {
    $this->getJson('/api/ipc', ['Origin' => 'https://app.example.com'])
        ->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', 'https://app.example.com');
});

test('other origins are not allowed', function () {
    // With one allowed origin, the header always names it, so the browser blocks any other origin.
    $allowed = $this->getJson('/api/ipc', ['Origin' => 'https://evil.example.com'])
        ->headers->get('Access-Control-Allow-Origin');

    expect($allowed)->not->toBe('https://evil.example.com');
});

test('browsers may only send GET requests', function () {
    $this->call('OPTIONS', '/api/ipc', server: [
        'HTTP_ORIGIN' => 'https://app.example.com',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
    ])->assertHeader('Access-Control-Allow-Methods', 'GET');
});
