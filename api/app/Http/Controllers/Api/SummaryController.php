<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\Enums\Currency;
use Illuminate\Validation\Rule;

class SummaryController extends Controller
{
    public function __invoke(Request $request)
    {
        $data = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'currency' => ['required', Rule::enum(Currency::class)],
        ]);

        $month = $data['month'] ?? now()->format('Y-m');
        $start = Carbon::parse($month.'-01');
        $range = [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()];

        $totals = $request->user()->transactions()
            ->whereBetween('date', $range)
            ->where('currency', $data['currency'])
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0.00) AS income")
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0.00) AS expense")
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0.00) AS balance")
            ->first();

        $byCategory = $request->user()->transactions()
            ->join('categories', 'categories.id', '=', 'transactions.category_id')
            ->where('transactions.type', 'expense')
            ->where('transactions.currency', $data['currency'])
            ->whereBetween('transactions.date', $range)
            ->groupBy('categories.id', 'categories.name')
            ->selectRaw('categories.name, SUM(transactions.amount) AS total')
            ->orderByDesc('total')
            ->get();

        return [
            'data' => [
                'month' => $month,
                'currency' => $data['currency'],
                'income' => $totals->income,
                'expense' => $totals->expense,
                'balance' => $totals->balance,
                'by_category' => $byCategory,
            ],
        ];
    }
}