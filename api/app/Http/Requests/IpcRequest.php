<?php

namespace App\Http\Requests;

use App\Data\IpcMonth;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IpcRequest extends FormRequest
{
    private const FROM = 'from';

    private const TO = 'to';

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $month = ['nullable', Rule::date()->format(IpcMonth::FORMAT)];

        return [
            self::FROM => $month,
            self::TO => $month,
        ];
    }

    public function from(): ?string
    {
        return $this->validated(self::FROM);
    }

    public function to(): ?string
    {
        return $this->validated(self::TO);
    }
}
