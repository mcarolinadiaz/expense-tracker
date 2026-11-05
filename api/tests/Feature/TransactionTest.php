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