<?php

use App\Services\SeriesSettings;
use Illuminate\Support\Facades\Http;

function fakeTwoPercentIpc(): void
{
    // An index that rises 2% each month, from March to August 2026.
    $rows = [];
    $index = 100.0;

    foreach (['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'] as $month) {
        $rows[] = [$month.'-01', $index];
        $index = round($index * 1.02, 6);
    }

    Http::fake([app(SeriesSettings::class)->url.'/*' => Http::response(['data' => $rows])]);
}

function factorsUrl(array $query): string
{
    return '/api/ipc/factors?'.http_build_query($query);
}

beforeEach(function () {
    Http::preventStrayRequests();
});

test('it projects a cost that increases every 2 months, estimating months without official data', function () {
    fakeTwoPercentIpc();

    $this->getJson(factorsUrl(['from' => '2026-08', 'months' => 4, 'every' => 2, 'estimate' => 'average']))
        ->assertOk()
        ->assertExactJson([
            'data' => [
                ['month' => '2026-08', 'factor' => '1.0000', 'increases' => false, 'estimated' => false],
                ['month' => '2026-09', 'factor' => '1.0000', 'increases' => false, 'estimated' => false],
                ['month' => '2026-10', 'factor' => '1.0404', 'increases' => true, 'estimated' => true],
                ['month' => '2026-11', 'factor' => '1.0404', 'increases' => false, 'estimated' => true],
            ],
            'meta' => [
                'last_month' => '2026-08',
                'estimate' => 'average',
                'monthly_estimate' => '2.00',
                'source' => 'INDEC',
            ],
        ]);
});

test('an increase uses only official data when it is available', function () {
    fakeTwoPercentIpc();

    $this->getJson(factorsUrl([
        'from' => '2026-08', 'months' => 2, 'every' => 4, 'last_increase' => '2026-05', 'estimate' => 'average',
    ]))
        ->assertOk()
        ->assertJsonPath('data.1.month', '2026-09')
        ->assertJsonPath('data.1.increases', true)
        ->assertJsonPath('data.1.factor', '1.0824')
        ->assertJsonPath('data.1.estimated', false);
});

test('it can use a custom monthly rate', function () {
    fakeTwoPercentIpc();

    $this->getJson(factorsUrl([
        'from' => '2026-10', 'months' => 3, 'every' => 1, 'estimate' => 'custom', 'rate' => '3',
    ]))
        ->assertOk()
        ->assertJsonPath('meta.monthly_estimate', '3.00')
        ->assertJsonPath('meta.estimate', 'custom')
        ->assertJsonPath('data.1.factor', '1.0300')
        ->assertJsonPath('data.2.factor', '1.0609');
});

test('the average only uses the requested number of recent months', function () {
    Http::fake([app(SeriesSettings::class)->url.'/*' => Http::response(['data' => [
        ['2026-05-01', 100.0],
        ['2026-06-01', 110.0],
        ['2026-07-01', 111.1],
        ['2026-08-01', 112.211],
    ]])]);

    $this->getJson(factorsUrl(['from' => '2026-08', 'months' => 1, 'every' => 1, 'estimate' => 'average', 'average_months' => 2]))
        ->assertOk()
        ->assertJsonPath('meta.monthly_estimate', '1.00');
});

test('the first month never increases, because its amount is the current one', function () {
    fakeTwoPercentIpc();

    $this->getJson(factorsUrl(['from' => '2026-08', 'months' => 1, 'every' => 1, 'last_increase' => '2026-07', 'estimate' => 'average']))
        ->assertOk()
        ->assertJsonPath('data.0.increases', false)
        ->assertJsonPath('data.0.factor', '1.0000');
});

test('invalid parameters are rejected', function (array $override, string $field) {
    $valid = ['from' => '2026-08', 'months' => 12, 'every' => 3, 'estimate' => 'average'];

    $this->getJson(factorsUrl([...$valid, ...$override]))->assertJsonValidationErrors($field);
})->with([
    'missing from' => [['from' => null], 'from'],
    'month format' => [['from' => '08/2026'], 'from'],
    'zero months' => [['months' => 0], 'months'],
    'too many months' => [['months' => 25], 'months'],
    'decimal months' => [['months' => 1.5], 'months'],
    'every over a year' => [['every' => 13], 'every'],
    'unknown estimate' => [['estimate' => 'rem'], 'estimate'],
    'custom without rate' => [['estimate' => 'custom'], 'rate'],
    'rate too high' => [['estimate' => 'custom', 'rate' => 51], 'rate'],
    'rate with 3 decimals' => [['estimate' => 'custom', 'rate' => '1.234'], 'rate'],
    'last increase after from' => [['last_increase' => '2026-09'], 'last_increase'],
    'average over 2 years' => [['average_months' => 25], 'average_months'],
]);

test('validation messages are translated', function () {
    $this->getJson(factorsUrl(['from' => '2026-08', 'months' => 30, 'every' => 3, 'estimate' => 'custom']), ['Accept-Language' => 'es-AR'])
        ->assertJsonPath('errors.months.0', 'El campo meses debe estar entre 1 y 24.')
        ->assertJsonPath('errors.rate.0', 'El campo tasa es obligatorio.');
});

test('it is public and returns 503 when the official data is unavailable', function () {
    Http::fake([app(SeriesSettings::class)->url.'/*' => Http::response('Server error', 500)]);

    $this->getJson(factorsUrl(['from' => '2026-08', 'months' => 3, 'every' => 1, 'estimate' => 'average']))
        ->assertStatus(503);
});
