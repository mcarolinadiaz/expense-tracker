<?php

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->category = Category::factory()->create(['user_id' => $this->user->id, 'name' => 'Food']);
    Sanctum::actingAs($this->user);

    $this->valid = [
        'category_id' => $this->category->id,
        'type' => 'expense',
        'currency' => 'USD',
        'amount' => 25.50,
        'date' => '2026-11-05',
        'description' => 'Lunch',
    ];
});

test('you can create a transaction', function () {
    $this->postJson('/api/transactions', $this->valid)
        ->assertCreated()
        ->assertJsonPath('data.amount', '25.50')
        ->assertJsonPath('data.type', 'expense')
        ->assertJsonPath('data.currency', 'USD')
        ->assertJsonPath('data.date', '2026-11-05')
        ->assertJsonPath('data.category.name', 'Food')
        ->assertJsonMissingPath('data.user_id');
});

test('user_id always comes from the token, not the request', function () {
    $other = User::factory()->create();

    $this->postJson('/api/transactions', [...$this->valid, 'user_id' => $other->id])
        ->assertCreated();

    expect($other->transactions()->count())->toBe(0)
        ->and($this->user->transactions()->count())->toBe(1);
});

test('invalid data is rejected', function (string $field, mixed $value) {
    $this->postJson('/api/transactions', [...$this->valid, $field => $value])
        ->assertJsonValidationErrors($field);
})->with([
    'zero amount' => ['amount', 0],
    'negative amount' => ['amount', -5],
    'too many decimals' => ['amount', 1.234],
    'amount that is not a number' => ['amount', 'abc'],
    'unknown type' => ['type', 'gift'],
    'unknown currency' => ['currency', 'EUR'],
    'lowercase currency' => ['currency', 'usd'],
    'missing currency' => ['currency', null],
    'wrong date format' => ['date', '05/11/2026'],
    'category that does not exist' => ['category_id', 999999],
]);

test('you cannot use another user\'s category', function () {
    $theirs = Category::factory()->create();

    $this->postJson('/api/transactions', [...$this->valid, 'category_id' => $theirs->id])
        ->assertJsonValidationErrors('category_id');
});

test('the list is paginated, newest first, and only contains yours', function () {
    Transaction::factory()->count(16)->create([
        'user_id' => $this->user->id,
        'category_id' => $this->category->id,
        'date' => '2026-10-01',
    ]);
    Transaction::factory()->create([
        'user_id' => $this->user->id,
        'category_id' => $this->category->id,
        'date' => '2026-11-01',
    ]);
    Transaction::factory()->create();

    $this->getJson('/api/transactions')
        ->assertOk()
        ->assertJsonCount(15, 'data')
        ->assertJsonPath('data.0.date', '2026-11-01')
        ->assertJsonPath('meta.total', 17);

    $this->getJson('/api/transactions?page=2')->assertJsonCount(2, 'data');
});

test('you can update your transaction', function () {
    $transaction = Transaction::factory()->create(['user_id' => $this->user->id]);

    $this->putJson("/api/transactions/{$transaction->id}", [...$this->valid, 'amount' => 30])
        ->assertOk()
        ->assertJsonPath('data.amount', '30.00')
        ->assertJsonPath('data.category.name', 'Food');
});

test('you can delete your transaction', function () {
    $transaction = Transaction::factory()->create(['user_id' => $this->user->id]);

    $this->deleteJson("/api/transactions/{$transaction->id}")->assertNoContent();

    $this->assertDatabaseMissing('transactions', ['id' => $transaction->id]);
});

test('you cannot see, change or delete another user\'s transaction', function () {
    $transaction = Transaction::factory()->create();

    $this->getJson("/api/transactions/{$transaction->id}")->assertForbidden();
    $this->putJson("/api/transactions/{$transaction->id}", $this->valid)->assertForbidden();
    $this->deleteJson("/api/transactions/{$transaction->id}")->assertForbidden();

    $this->assertDatabaseHas('transactions', ['id' => $transaction->id]);
});

test('the list can be filtered', function (array $filter, int $expected) {
    $other = Category::factory()->create(['user_id' => $this->user->id, 'name' => 'Other']);
    $add = fn (array $attributes) => Transaction::factory()->create([
        'user_id' => $this->user->id,
        'category_id' => $this->category->id,
        'type' => 'expense',
        'currency' => 'ARS',
        'date' => '2026-11-15',
        'description' => null,
        ...$attributes,
    ]);

    $add(['description' => 'Team lunch']);
    $add(['type' => 'income', 'description' => 'Salary']);
    $add(['currency' => 'USD', 'description' => 'Hosting']);
    $add(['category_id' => $other->id]);
    $add(['date' => '2026-10-31']);
    $add(['date' => '2026-12-01']);
    Transaction::factory()->create(['date' => '2026-11-15', 'currency' => 'ARS', 'type' => 'expense', 'description' => 'Team lunch']);

    if (isset($filter['category_id'])) {
        $filter['category_id'] = $other->id;
    }

    $this->getJson('/api/transactions?'.http_build_query($filter))
        ->assertOk()
        ->assertJsonCount($expected, 'data');
})->with([
    'no filters' => [[], 6],
    'month' => [['month' => '2026-11'], 4],
    'month with no results' => [['month' => '2020-01'], 0],
    'currency' => [['currency' => 'USD'], 1],
    'type' => [['type' => 'income'], 1],
    'category' => [['category_id' => true], 1],
    'search' => [['search' => 'LUNCH'], 1],
    'combined' => [['month' => '2026-11', 'currency' => 'ARS', 'type' => 'expense'], 2],
    'empty filter is ignored' => [['type' => ''], 6],
]);

test('search treats % and _ as normal characters', function () {
    Transaction::factory()->create(['user_id' => $this->user->id, 'description' => '50% off']);
    Transaction::factory()->create(['user_id' => $this->user->id, 'description' => 'Lunch']);

    $this->getJson('/api/transactions?search=%25')->assertJsonCount(1, 'data');
    $this->getJson('/api/transactions?search=_')->assertJsonCount(0, 'data');
});

test('pagination links keep the filters', function () {
    Transaction::factory()->count(16)->create([
        'user_id' => $this->user->id,
        'category_id' => $this->category->id,
        'currency' => 'USD',
    ]);

    $next = $this->getJson('/api/transactions?currency=USD')->json('links.next');

    expect($next)->toContain('currency=USD')->toContain('page=2');
});

test('invalid filters are rejected', function (string $field, mixed $value) {
    $this->getJson('/api/transactions?'.http_build_query([$field => $value]))
        ->assertJsonValidationErrors($field);
})->with([
    'month format' => ['month', '2026-13'],
    'unknown currency' => ['currency', 'EUR'],
    'unknown type' => ['type', 'gift'],
    'category that does not exist' => ['category_id', 999999],
    'category that is not a number' => ['category_id', 'abc'],
    'search that is too long' => ['search', str_repeat('a', 101)],
]);

test('you cannot filter by another user\'s category', function () {
    $theirs = Transaction::factory()->create();

    $this->getJson("/api/transactions?category_id={$theirs->category_id}")
        ->assertJsonValidationErrors('category_id');
});