<?php

namespace Tests\Feature\Auth;

use App\Modules\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginTest extends TestCase
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

    public function test_login_with_valid_credentials_returns_token(): void
    {
        $this->createUser(['username' => 'parent', 'role' => 'parent']);

        $response = $this->postJson('/api/auth/login', [
            'username' => 'parent',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'access_token',
                    'token_type',
                    'expires_in',
                    'user' => ['id', 'username', 'role'],
                ],
            ])
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonPath('data.user.username', 'parent')
            ->assertJsonPath('data.user.role', 'parent');
    }

    public function test_login_with_wrong_password_returns_401(): void
    {
        $this->createUser();

        $response = $this->postJson('/api/auth/login', [
            'username' => 'testuser',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('error', 'invalid_credentials');
    }

    public function test_login_with_unknown_user_returns_401(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'nobody',
            'password' => 'password',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('error', 'invalid_credentials');
    }

    public function test_login_with_inactive_user_returns_401(): void
    {
        $this->createUser(['is_active' => false]);

        $response = $this->postJson('/api/auth/login', [
            'username' => 'testuser',
            'password' => 'password',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('error', 'user_inactive');
    }

    public function test_login_without_username_returns_422(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'password' => 'password',
        ]);

        $response->assertStatus(422);
    }

    public function test_login_without_password_returns_422(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'testuser',
        ]);

        $response->assertStatus(422);
    }
}
