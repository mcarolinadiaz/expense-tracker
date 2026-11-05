<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $transactions = $request->user()->transactions()
            ->with('category')
            ->latest('date')
            ->latest('id')
            ->paginate(15);

        return TransactionResource::collection($transactions);
    }

    public function store(TransactionRequest $request)
    {
        $transaction = $request->user()->transactions()->create($request->validated());

        return new TransactionResource($transaction->load('category'));
    }

    public function show(Transaction $transaction)
    {
        Gate::authorize('manage', $transaction);

        return new TransactionResource($transaction->load('category'));
    }

    public function update(TransactionRequest $request, Transaction $transaction)
    {
        Gate::authorize('manage', $transaction);

        $transaction->update($request->validated());

        return new TransactionResource($transaction->load('category'));
    }

    public function destroy(Transaction $transaction)
    {
        Gate::authorize('manage', $transaction);

        $transaction->delete();

        return response()->noContent();
    }
}