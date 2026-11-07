<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class IpcUnavailableException extends Exception
{
    private const MESSAGE = 'Inflation data is temporarily unavailable. Please try again later.';

    public function render(): JsonResponse
    {
        return response()->json(['message' => __(self::MESSAGE)], Response::HTTP_SERVICE_UNAVAILABLE);
    }
}
