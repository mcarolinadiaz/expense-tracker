<?php

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    Sanctum::actingAs($this->user);
});

test('the list only contains your own categories', function () {
    Category::factory()->create(['user_id' => $this->user->id, 'name' => 'Mine']);
    Category::factory()->create(['name' => 'Theirs']);

    $this->getJson('/api/categories')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Mine');
});

test('you can create a category', function () {
    $this->postJson('/api/categories', ['name' => 'Food'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Food')
        ->assertJsonMissingPath('data.user_id');

    $this->assertDatabaseHas('categories', ['user_id' => $this->user->id, 'name' => 'Food']);
});

test('you cannot have two categories with the same name', function () {
    Category::factory()->create(['user_id' => $this->user->id, 'name' => 'Food']);

    $this->postJson('/api/categories', ['name' => 'Food'])
        ->assertJsonValidationErrors('name');
});

test('two users can use the same category name', function () {
    Category::factory()->create(['name' => 'Food']);

    $this->postJson('/api/categories', ['name' => 'Food'])->assertCreated();
});

test('you can rename your category', function () {
    $category = Category::factory()->create(['user_id' => $this->user->id]);

    $this->putJson("/api/categories/{$category->id}", ['name' => 'Groceries'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Groceries');
});

test('you cannot change or delete another user\'s category', function () {
    $category = Category::factory()->create();

    $this->putJson("/api/categories/{$category->id}", ['name' => 'Hacked'])->assertForbidden();
    $this->deleteJson("/api/categories/{$category->id}")->assertForbidden();

    $this->assertDatabaseHas('categories', ['id' => $category->id, 'name' => $category->name]);
});

test('you can delete an unused category', function () {
    $category = Category::factory()->create(['user_id' => $this->user->id]);

    $this->deleteJson("/api/categories/{$category->id}")->assertNoContent();

    $this->assertDatabaseMissing('categories', ['id' => $category->id]);
});

test('you cannot delete a category that has transactions', function () {
    $transaction = Transaction::factory()->create(['user_id' => $this->user->id]);

    $this->deleteJson("/api/categories/{$transaction->category_id}")
        ->assertConflict();

    $this->assertDatabaseHas('categories', ['id' => $transaction->category_id]);
});