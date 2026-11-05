<?php

namespace Database\Factories;

use App\Enums\TransactionType;
use App\Enums\Currency;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Transaction>
 */
class TransactionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'category_id' => fn (array $attributes) => Category::factory()->create([
                'user_id' => $attributes['user_id'],
            ]),
            'type' => fake()->randomElement(TransactionType::cases()),
            'currency' => fake()->randomElement(Currency::cases()),
            'amount' => fake()->randomFloat(2, 1, 500),
            'date' => fake()->date(),
            'description' => fake()->optional()->sentence(3),
        ];
    }
}