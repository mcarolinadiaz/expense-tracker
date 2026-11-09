<?php

namespace App\Http\Requests;

use App\Data\IpcFactorsQuery;
use App\Data\IpcMonth;
use App\Enums\IpcEstimate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IpcFactorsRequest extends FormRequest
{
    private const FROM = 'from';

    private const MONTHS = 'months';

    private const EVERY = 'every';

    private const LAST_INCREASE = 'last_increase';

    private const ESTIMATE = 'estimate';

    private const RATE = 'rate';

    private const AVERAGE_MONTHS = 'average_months';

    private const MIN_MONTHS = 1;

    private const MAX_MONTHS = 24;

    private const MAX_EVERY = 12;

    private const MAX_AVERAGE_MONTHS = 24;

    private const DEFAULT_AVERAGE_MONTHS = 6;

    private const MIN_RATE = 0;

    private const MAX_RATE = 50;

    private const RATE_DECIMALS = 2;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $month = Rule::date()->format(IpcMonth::FORMAT);
        $monthCount = fn (int $max) => Rule::numeric()->integer()->between(self::MIN_MONTHS, $max);

        return [
            self::FROM => ['required', $month],
            self::MONTHS => ['required', $monthCount(self::MAX_MONTHS)],
            self::EVERY => ['required', $monthCount(self::MAX_EVERY)],
            self::LAST_INCREASE => ['nullable', Rule::date()->format(IpcMonth::FORMAT)->beforeOrEqual(self::FROM)],
            self::ESTIMATE => ['required', Rule::enum(IpcEstimate::class)],
            self::RATE => [
                Rule::requiredIf(fn () => $this->input(self::ESTIMATE) === IpcEstimate::Custom->value),
                'nullable',
                Rule::numeric()->decimal(self::MIN_RATE, self::RATE_DECIMALS)->between(self::MIN_RATE, self::MAX_RATE),
            ],
            self::AVERAGE_MONTHS => ['nullable', $monthCount(self::MAX_AVERAGE_MONTHS)],
        ];
    }

    public function toQuery(): IpcFactorsQuery
    {
        $data = $this->validated();

        return new IpcFactorsQuery(
            from: $data[self::FROM],
            months: (int) $data[self::MONTHS],
            every: (int) $data[self::EVERY],
            lastIncrease: $data[self::LAST_INCREASE] ?? $data[self::FROM],
            estimate: IpcEstimate::from($data[self::ESTIMATE]),
            rate: $data[self::RATE] ?? null,
            averageMonths: (int) ($data[self::AVERAGE_MONTHS] ?? self::DEFAULT_AVERAGE_MONTHS),
        );
    }
}
