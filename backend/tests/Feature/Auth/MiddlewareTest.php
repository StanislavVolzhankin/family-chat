<?php

namespace Tests\Feature\Auth;

use App\Modules\Auth\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'username'      => 'testuser',
            'password_hash' => Hash::make('password'),
            'role'          => 'child',
            'is_active'     => true,
        ], $overrides));
    }

    private function tokenFor(User $user): string
    {
        $now = time();
        $payload = [
            'iss'      => config('app.url'),
            'sub'      => $user->id,
            'iat'      => $now,
            'exp'      => $now + 3600,
            'username' => $user->username,
            'role'     => $user->role,
        ];

        return JWT::encode($payload, config('auth.jwt_secret'), 'HS256');
    }

    // =========================================================================
    // AuthenticateJwt
    // =========================================================================

    public function test_request_without_authorization_header_returns_401(): void
    {
        $this->getJson('/api/users')
            ->assertStatus(401)
            ->assertJsonPath('error', 'unauthorized');
    }

    public function test_request_with_invalid_token_returns_401(): void
    {
        $this->getJson('/api/users', ['Authorization' => 'Bearer not.a.valid.jwt'])
            ->assertStatus(401)
            ->assertJsonPath('error', 'unauthorized');
    }

    public function test_request_with_token_for_deleted_user_returns_401(): void
    {
        $user  = $this->createUser(['username' => 'ghost', 'role' => 'parent']);
        $token = $this->tokenFor($user);
        $user->delete();

        $this->getJson('/api/users', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(401)
            ->assertJsonPath('error', 'unauthorized');
    }

    public function test_request_with_token_for_inactive_user_returns_401(): void
    {
        $user  = $this->createUser(['username' => 'inactive', 'role' => 'parent', 'is_active' => false]);
        $token = $this->tokenFor($user);

        $this->getJson('/api/users', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(401)
            ->assertJsonPath('error', 'unauthorized');
    }

    // =========================================================================
    // RequireParentRole
    // =========================================================================

    public function test_child_token_returns_403_on_users_endpoint(): void
    {
        $user  = $this->createUser(['username' => 'child1', 'role' => 'child']);
        $token = $this->tokenFor($user);

        $this->getJson('/api/users', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403)
            ->assertJsonPath('error', 'forbidden');
    }

    public function test_parent_token_passes_both_middleware(): void
    {
        $user  = $this->createUser(['username' => 'parent1', 'role' => 'parent']);
        $token = $this->tokenFor($user);

        $this->getJson('/api/users', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(200);
    }
}
