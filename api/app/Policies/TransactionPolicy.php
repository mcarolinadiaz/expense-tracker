<?php

namespace App\Policies;

use App\Models\Transaction;
use App\Models\User;

class TransactionPolicy
{
    public function manage(User $user, Transaction $transaction): bool
    {
        return $user->id === $transaction->user_id;
    }
}