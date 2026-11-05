<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;

#[Fillable(['name'])]
class Category extends Model
{
    use HasFactory;
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }
}