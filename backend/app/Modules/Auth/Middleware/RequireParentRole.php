<?php

namespace App\Modules\Auth\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireParentRole
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->attributes->get('auth_user');

        if (! $user) {
            return response()->json(['error' => 'unauthorized'], 401);
        }

        if ($user->role !== 'parent') {
            return response()->json(['error' => 'forbidden'], 403);
        }

        return $next($request);
    }
}
