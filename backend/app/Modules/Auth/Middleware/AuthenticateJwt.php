<?php

namespace App\Modules\Auth\Middleware;

use App\Modules\Auth\Models\User;
use App\Modules\Auth\Services\AuthService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateJwt
{
    public function handle(Request $request, Closure $next): Response
    {
        $authorization = $request->header('Authorization');

        if (! $authorization || ! str_starts_with($authorization, 'Bearer ')) {
            return response()->json(['error' => 'unauthorized'], 401);
        }

        $token = substr($authorization, 7);

        try {
            $decoded = AuthService::decodeToken($token);
        } catch (\InvalidArgumentException | \RuntimeException) {
            return response()->json(['error' => 'unauthorized'], 401);
        }

        $user = User::find($decoded->sub);

        if (! $user || ! $user->is_active) {
            return response()->json(['error' => 'unauthorized'], 401);
        }

        $request->attributes->set('auth_user', $user);

        return $next($request);
    }
}
