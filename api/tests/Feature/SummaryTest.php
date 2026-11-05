<?php

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    Sanctum::actingAs($this->user);

    $this->add = fn (Category $category, string $type, string $amount, string $date, string $currency = 'ARS') => Transaction::factory()->create([
        'user_id' => $category->user_id,
        'category_id' => $category->id,
        'type' => $type,
        'currency' => $currency,
        'amount' => $amount,
        'date' => $date,
    ]);
});

test('it calculates exact totals for the month', function () {
    $food = Category::factory()->create(['user_id' => $this->user->id, 'name' => 'Food']);
    $bills = Category::factory()->create(['user_id' => $this->user->id, 'name' => 'Bills']);
    $salary = Category::factory()->create(['user_id' => $this->user->id, 'name' => 'Salary']);

    ($this->add)($salary, 'income', '1000.50', '2026-11-01');
    ($this->add)($food, 'expense', '0.10', '2026-11-05');
    ($this->add)($food, 'expense', '0.20', '2026-11-30');
    ($this->add)($bills, 'expense', '100.00', '2026-11-10');

    $this->getJson('/api/summary?month=2026-11&currency=ARS')
        ->assertOk()
        ->assertExactJson(['data' => [
            'month' => '2026-11',
            'currency' => 'ARS',
            'income' => '1000.50',
            'expense' => '100.30',
            'balance' => '900.20',
            'by_category' => [
                ['name' => 'Bills', 'total' => '100.00'],
                ['name' => 'Food', 'total' => '0.30'],
            ],
        ]]);
});

test('it leaves out other months', function () {
    $food = Category::factory()->create(['user_id' => $this->user->id]);

    ($this->add)($food, 'expense', '10.00', '2026-11-15');
    ($this->add)($food, 'expense', '99.00', '2026-10-31');
    ($this->add)($food, 'expense', '99.00', '2026-12-01');

    $this->getJson('/api/summary?month=2026-11&currency=ARS')->assertJsonPath('data.expense', '10.00');
});

test('it leaves out other users', function () {
    $mine = Category::factory()->create(['user_id' => $this->user->id, 'name' => 'Mine']);
    $theirs = Category::factory()->create(['name' => 'Theirs']);

    ($this->add)($mine, 'expense', '10.00', '2026-11-15');
    ($this->add)($theirs, 'expense', '99.00', '2026-11-15');
    ($this->add)($theirs, 'income', '99.00', '2026-11-15');

    $this->getJson('/api/summary?month=2026-11&currency=ARS')
        ->assertJsonPath('data.expense', '10.00')
        ->assertJsonPath('data.income', '0.00')
        ->assertJsonCount(1, 'data.by_category')
        ->assertJsonPath('data.by_category.0.name', 'Mine');
});

test('an empty month returns zeros', function () {
    $this->getJson('/api/summary?month=2020-01&currency=ARS')
        ->assertOk()
        ->assertJsonPath('data.income', '0.00')
        ->assertJsonPath('data.expense', '0.00')
        ->assertJsonPath('data.balance', '0.00')
        ->assertJsonPath('data.by_category', []);
});

test('an invalid month is rejected', function (string $month) {
    $this->getJson("/api/summary?month={$month}&currency=ARS")->assertJsonValidationErrors('month');
})->with(['2026-13', '2026-1', 'November']);

test('it never adds different currencies together', function () {
    $food = Category::factory()->create(['user_id' => $this->user->id, 'name' => 'Food']);
    $salary = Category::factory()->create(['user_id' => $this->user->id, 'name' => 'Salary']);

    ($this->add)($food, 'expense', '10.00', '2026-11-15', 'ARS');
    ($this->add)($food, 'expense', '3.00', '2026-11-15', 'USD');
    ($this->add)($salary, 'income', '50.00', '2026-11-15', 'USD');

    $this->getJson('/api/summary?month=2026-11&currency=ARS')
        ->assertJsonPath('data.income', '0.00')
        ->assertJsonPath('data.expense', '10.00')
        ->assertJsonPath('data.by_category.0.total', '10.00');

    $this->getJson('/api/summary?month=2026-11&currency=USD')
        ->assertJsonPath('data.income', '50.00')
        ->assertJsonPath('data.expense', '3.00')
        ->assertJsonPath('data.balance', '47.00')
        ->assertJsonPath('data.by_category.0.total', '3.00');
});

test('the summary requires a valid currency', function (string $url) {
    $this->getJson($url)->assertJsonValidationErrors('currency');
})->with([
    'missing' => '/api/summary?month=2026-11',
    'unknown' => '/api/summary?month=2026-11&currency=EUR',
]);