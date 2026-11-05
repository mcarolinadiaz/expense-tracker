<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('a user can register and gets a token', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Ana',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertCreated()->assertJsonStructure(['token']);

    $user = User::where('email', 'ana@example.com')->first();
    expect(Hash::check('password123', $user->password))->toBeTrue();
});

test('registering requires a matching password confirmation', function () {
    $this->postJson('/api/register', [
        'name' => 'Ana',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'different',
    ])->assertJsonValidationErrors('password');
});

test('a user can log in with the correct password', function () {
    $user = User::factory()->create();

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->assertJsonStructure(['token']);
});

test('logging in fails with the wrong password', function () {
    $user = User::factory()->create();

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ])->assertJsonValidationErrors('email');
});

test('login is limited to 5 attempts per minute', function () {
    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/login', ['email' => 'ana@example.com', 'password' => 'wrong']);
    }

    $this->postJson('/api/login', ['email' => 'ana@example.com', 'password' => 'wrong'])
        ->assertTooManyRequests();
});

test('logging out deletes the token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('web')->plainTextToken;

    $this->withToken($token)->postJson('/api/logout')->assertNoContent();

    $this->assertDatabaseCount('personal_access_tokens', 0);
});

test('protected routes require a token', function (string $url) {
    $this->getJson($url)->assertUnauthorized();
})->with(['/api/user', '/api/categories', '/api/transactions', '/api/summary']);
