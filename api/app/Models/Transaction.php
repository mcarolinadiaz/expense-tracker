<?php

namespace App\Models;

use App\Enums\TransactionType;
use App\Enums\Currency;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Database\Factories\TransactionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

#[Fillable(['category_id', 'type', 'currency', 'amount', 'date', 'description'])]
class Transaction extends Model
{
    use HasFactory;
    protected function casts(): array
    {
        return [
            'type' => TransactionType::class,
            'currency' => Currency::class,
            'amount' => 'decimal:2',
            'date' => 'date',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    #[Scope]
    protected function inMonth(Builder $query, string $month): void
    {
        $start = Carbon::parse($month.'-01');

        $query->whereBetween($query->qualifyColumn('date'), [
            $start->toDateString(),
            $start->copy()->endOfMonth()->toDateString(),
        ]);
    }

    #[Scope]
    protected function filter(Builder $query, array $filters): void
    {
        $query
            ->when($filters['month'] ?? null, fn (Builder $query, $month) => $query->inMonth($month))
            ->when($filters['currency'] ?? null, fn (Builder $query, $currency) => $query->where('currency', $currency))
            ->when($filters['type'] ?? null, fn (Builder $query, $type) => $query->where('type', $type))
            ->when($filters['category_id'] ?? null, fn (Builder $query, $categoryId) => $query->where('category_id', $categoryId))
            ->when($filters['search'] ?? null, fn (Builder $query, $search) => $query->where(
                'description',
                'like',
                '%'.addcslashes($search, '%_\\').'%'
            ));
    }
}