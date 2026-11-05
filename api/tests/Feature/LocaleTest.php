<?php

use App\Models\Transaction;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('the language comes from the Accept-Language header', function (?string $header, string $message) {
    $headers = $header ? ['Accept-Language' => $header] : [];

    $this->postJson('/api/login', ['email' => 'ana@example.com'], $headers)
        ->assertJsonPath('errors.password.0', $message);
})->with([
    'argentine spanish' => ['es-AR', 'El campo contraseña es obligatorio.'],
    'spanish' => ['es', 'El campo contraseña es obligatorio.'],
    'browser style list' => ['es-AR,es;q=0.9,en;q=0.8', 'El campo contraseña es obligatorio.'],
    'american english' => ['en-US', 'The password field is required.'],
    'unsupported language' => ['fr-FR', 'The password field is required.'],
    'no header' => [null, 'The password field is required.'],
]);

test('login errors are translated', function () {
    $user = User::factory()->create();

    $this->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong'], ['Accept-Language' => 'es-AR'])
        ->assertJsonPath('errors.email.0', 'Las credenciales no son correctas.');
});

test('the category conflict message is translated', function () {
    $user = User::factory()->create();
    $transaction = Transaction::factory()->create(['user_id' => $user->id]);
    Sanctum::actingAs($user);

    $this->deleteJson("/api/categories/{$transaction->category_id}", [], ['Accept-Language' => 'es-AR'])
        ->assertConflict()
        ->assertJsonPath('message', 'Esta categoría todavía tiene transacciones.');
});

test('the summary of several errors is translated', function () {
    $this->postJson('/api/login', [], ['Accept-Language' => 'es-AR'])
        ->assertJsonPath('message', 'El campo correo electrónico es obligatorio. (y 1 error más)');
});