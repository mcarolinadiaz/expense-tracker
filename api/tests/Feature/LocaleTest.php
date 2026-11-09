<?php

use App\Services\SeriesSettings;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Http::preventStrayRequests();
});

test('the language comes from the Accept-Language header', function (?string $header, string $message) {
    $headers = $header ? ['Accept-Language' => $header] : [];

    $this->getJson('/api/ipc/factors?every=3&estimate=average&from=2026-08', $headers)
        ->assertJsonPath('errors.months.0', $message);
})->with([
    'argentine spanish' => ['es-AR', 'El campo meses es obligatorio.'],
    'spanish' => ['es', 'El campo meses es obligatorio.'],
    'browser style list' => ['es-AR,es;q=0.9,en;q=0.8', 'El campo meses es obligatorio.'],
    'american english' => ['en-US', 'The months field is required.'],
    'unsupported language' => ['fr-FR', 'The months field is required.'],
    'no header' => [null, 'The months field is required.'],
]);

test('every validation message used by the API is translated', function (string $query, string $field) {
    $message = $this->getJson('/api/ipc/factors?'.$query, ['Accept-Language' => 'es-AR'])
        ->assertUnprocessable()
        ->json("errors.$field.0");

    expect($message)->toStartWith('El ')->not->toContain($field);
})->with([
    'month format' => ['from=08-2026&months=3&every=1&estimate=average', 'from'],
    'between' => ['from=2026-08&months=30&every=1&estimate=average', 'months'],
    'integer' => ['from=2026-08&months=1.5&every=1&estimate=average', 'months'],
    'enum' => ['from=2026-08&months=3&every=1&estimate=rem', 'estimate'],
    'decimal' => ['from=2026-08&months=3&every=1&estimate=custom&rate=1.234', 'rate'],
    'numeric' => ['from=2026-08&months=3&every=1&estimate=custom&rate=abc', 'rate'],
    'before or equal' => ['from=2026-08&months=3&every=1&estimate=average&last_increase=2026-09', 'last_increase'],
]);

test('the summary of several errors is translated', function () {
    $this->getJson('/api/ipc/factors', ['Accept-Language' => 'es-AR'])
        ->assertJsonPath('message', fn (string $message) => str_contains($message, 'errores más'));
});

test('the unavailable data message is translated', function () {
    Http::fake([app(SeriesSettings::class)->url.'/*' => Http::response('Server error', 500)]);

    $this->getJson('/api/ipc', ['Accept-Language' => 'es-AR'])
        ->assertStatus(503)
        ->assertJsonPath('message', 'Los datos de inflación no están disponibles por el momento. Probá de nuevo más tarde.');
});
