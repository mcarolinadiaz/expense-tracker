<?php

use App\Services\IpcSeries;
use App\Services\SeriesSettings;
use Illuminate\Support\Facades\Http;

function seriesUrl(): string
{
    return app(SeriesSettings::class)->url.'/*';
}

function fakeIpcSeries(array $rows): void
{
    Http::fake([
        seriesUrl() => Http::response(['data' => $rows]),
    ]);
}

beforeEach(function () {
    Http::preventStrayRequests();
});

test('it returns the monthly variation of the official index', function () {
    fakeIpcSeries([
        ['2026-05-01', 100.0],
        ['2026-06-01', 102.0],
        ['2026-07-01', 104.04],
        ['2026-08-01', 105.5],
    ]);

    $this->getJson('/api/ipc')
        ->assertOk()
        ->assertExactJson([
            'data' => [
                ['month' => '2026-06', 'variation' => '2.00'],
                ['month' => '2026-07', 'variation' => '2.00'],
                ['month' => '2026-08', 'variation' => '1.40'],
            ],
            'meta' => ['last_month' => '2026-08', 'source' => 'INDEC'],
        ]);
});

test('it can be limited to a range of months', function () {
    fakeIpcSeries([
        ['2026-05-01', 100.0],
        ['2026-06-01', 102.0],
        ['2026-07-01', 104.04],
        ['2026-08-01', 105.5],
    ]);

    $this->getJson('/api/ipc?from=2026-07&to=2026-07')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.month', '2026-07')
        ->assertJsonPath('meta.last_month', '2026-08');
});

test('it is public', function () {
    fakeIpcSeries([['2026-05-01', 100.0], ['2026-06-01', 101.0]]);

    $this->getJson('/api/ipc')->assertOk();
});

test('it only calls the official API once while the data is cached', function () {
    fakeIpcSeries([['2026-05-01', 100.0], ['2026-06-01', 101.0]]);

    $this->getJson('/api/ipc')->assertOk();
    $this->getJson('/api/ipc')->assertOk();

    Http::assertSentCount(1);
});

test('it returns 503 when the official API fails, without caching the failure', function () {
    Http::fake([seriesUrl() => Http::response('Server error', 500)]);

    $this->getJson('/api/ipc', ['Accept-Language' => 'es-AR'])
        ->assertStatus(503)
        ->assertJsonPath('message', 'Los datos de inflación no están disponibles por el momento. Probá de nuevo más tarde.');

    expect(cache()->has(IpcSeries::CACHE_KEY))->toBeFalse();
});

test('it is rate limited by IP', function () {
    app()->instance(SeriesSettings::class, new SeriesSettings(
        ...[...get_object_vars(SeriesSettings::fromConfig()), 'rateLimitPerMinute' => 2],
    ));
    fakeIpcSeries([['2026-05-01', 100.0], ['2026-06-01', 101.0]]);

    $this->getJson('/api/ipc')->assertOk();
    $this->getJson('/api/ipc')->assertOk();
    $this->getJson('/api/ipc')->assertTooManyRequests();
});

test('invalid months are rejected', function (string $query, string $field) {
    $this->getJson('/api/ipc?'.$query)->assertJsonValidationErrors($field);
})->with([
    'from' => ['from=2026-13', 'from'],
    'to' => ['to=July', 'to'],
]);
