<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        return CategoryResource::collection(
            $request->user()->categories()->orderBy('name')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules($request));

        return new CategoryResource($request->user()->categories()->create($data));
    }

    public function update(Request $request, Category $category)
    {
        Gate::authorize('manage', $category);

        $category->update($request->validate($this->rules($request, $category)));

        return new CategoryResource($category);
    }

    public function destroy(Category $category)
    {
        Gate::authorize('manage', $category);

        abort_if(
            $category->transactions()->exists(),
            409,
            'This category still has transactions.'
        );

        $category->delete();

        return response()->noContent();
    }

    private function rules(Request $request, ?Category $category = null): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:60',
                Rule::unique('categories')
                    ->where('user_id', $request->user()->id)
                    ->ignore($category),
            ],
        ];
    }
}