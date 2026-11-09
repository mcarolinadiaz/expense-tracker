<?php

test('the API docs are public', function () {
    $this->get('/docs/api')->assertOk();
});

test('the OpenAPI document describes every endpoint', function () {
    $this->getJson('/docs/api.json')
        ->assertOk()
        ->assertJsonStructure(['paths' => ['/ipc', '/ipc/factors']]);
});

test('the docs do not start a session', function () {
    $this->get('/docs/api')->assertCookieMissing(config('session.cookie'));
});
