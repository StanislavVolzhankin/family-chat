<?php

namespace App\Modules\Auth\Services;

use App\Modules\Auth\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function authenticate(string $username, string $password): array
    {
        $user = User::where('username', $username)->first();

        if (! $user || ! Hash::check($password, $user->password_hash)) {
            throw new \InvalidArgumentException('invalid_credentials');
        }

        if (! $user->is_active) {
            throw new \InvalidArgumentException('user_inactive');
        }

        $token = $this->generateToken($user);
        $ttl   = (int) config('auth.jwt_ttl', 3600);

        return [
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'expires_in'   => $ttl,
            'user'         => [
                'id'       => $user->id,
                'username' => $user->username,
                'role'     => $user->role,
            ],
        ];
    }

    private function generateToken(User $user): string
    {
        $now = time();
        $ttl = (int) config('auth.jwt_ttl', 3600);

        $payload = [
            'iss'      => config('app.url'),
            'sub'      => $user->id,
            'iat'      => $now,
            'exp'      => $now + $ttl,
            'username' => $user->username,
            'role'     => $user->role,
        ];

        return JWT::encode($payload, $this->getSecret(), 'HS256');
    }

    public static function decodeToken(string $token): object
    {
        $service = new self();
        try {
            return JWT::decode($token, new Key($service->getSecret(), 'HS256'));
        } catch (\Exception $e) {
            throw new \InvalidArgumentException('invalid_token');
        }
    }

    private function getSecret(): string
    {
        $secret = config('auth.jwt_secret');

        if (! $secret) {
            throw new \RuntimeException('JWT_SECRET is not set');
        }

        return $secret;
    }
}
