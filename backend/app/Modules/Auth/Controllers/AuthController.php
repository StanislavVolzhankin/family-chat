<?php

namespace App\Modules\Auth\Controllers;

use App\Modules\Auth\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        try {
            $result = $this->authService->authenticate(
                $request->input('username'),
                $request->input('password')
            );

            return response()->json($result, 200);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error'   => $e->getMessage(),
                'message' => match ($e->getMessage()) {
                    'user_inactive'      => 'Your account is disabled.',
                    default              => 'The provided username or password is incorrect.',
                },
            ], 401);
        }
    }
}
