<?php

namespace App\Http\Requests;

use App\Enums\TransactionType;
use App\Enums\Currency;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => [
                'required',
                Rule::exists('categories', 'id')->where('user_id', $this->user()->id),
            ],
            'type' => ['required', Rule::enum(TransactionType::class)],
            'currency' => ['required', Rule::enum(Currency::class)],
            'amount' => ['required', 'decimal:0,2', 'gt:0', 'max:9999999999.99'],
            'date' => ['required', 'date_format:Y-m-d'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}