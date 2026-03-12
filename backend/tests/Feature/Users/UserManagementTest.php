<?php

namespace Tests\Feature\Users;

use App\Modules\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'username'      => 'testuser',
            'password_hash' => Hash::make('password123'),
            'role'          => 'child',
            'is_active'     => true,
        ], $overrides));
    }

    // =========================================================================
    // POST /api/users
    // =========================================================================

    public function test_create_user_returns_201_with_correct_structure(): void
    {
        $response = $this->postJson('/api/users', [
            'username' => 'alice',
            'password' => 'secret1',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['id', 'username', 'role', 'is_active', 'created_at'],
            ])
            ->assertJsonPath('data.username', 'alice')
            ->assertJsonPath('data.role', 'child')
            ->assertJsonPath('data.is_active', true);
    }

    public function test_create_user_stores_record_in_database(): void
    {
        $this->postJson('/api/users', [
            'username' => 'bob',
            'password' => 'mypass1',
        ]);

        $this->assertDatabaseHas('users', [
            'username'  => 'bob',
            'role'      => 'child',
            'is_active' => true,
        ]);
    }

    public function test_create_user_stores_hashed_password_not_plain_text(): void
    {
        $this->postJson('/api/users', [
            'username' => 'charlie',
            'password' => 'plainpass',
        ]);

        $user = User::where('username', 'charlie')->first();

        $this->assertNotNull($user);
        $this->assertNotEquals('plainpass', $user->password_hash);
        $this->assertTrue(Hash::check('plainpass', $user->password_hash));
    }

    public function test_create_user_with_duplicate_username_returns_422_username_taken(): void
    {
        $this->createUser(['username' => 'duplicate']);

        $response = $this->postJson('/api/users', [
            'username' => 'duplicate',
            'password' => 'anotherpass',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'username_taken');
    }

    public function test_create_user_without_username_returns_422_validation_error(): void
    {
        $response = $this->postJson('/api/users', [
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'validation_error');
    }

    public function test_create_user_without_password_returns_422_validation_error(): void
    {
        $response = $this->postJson('/api/users', [
            'username' => 'newuser',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'validation_error');
    }

    public function test_create_user_with_password_shorter_than_6_chars_returns_422_validation_error(): void
    {
        $response = $this->postJson('/api/users', [
            'username' => 'shortpw',
            'password' => '12345',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'validation_error');
    }

    // =========================================================================
    // GET /api/users
    // =========================================================================

    public function test_list_users_returns_200_with_data_array(): void
    {
        $this->createUser(['username' => 'user1']);
        $this->createUser(['username' => 'user2']);

        $response = $this->getJson('/api/users');

        $response->assertStatus(200)
            ->assertJsonStructure(['data'])
            ->assertJsonCount(2, 'data');
    }

    public function test_list_users_returns_empty_array_when_no_users_exist(): void
    {
        $response = $this->getJson('/api/users');

        $response->assertStatus(200)
            ->assertJson(['data' => []]);
    }

    public function test_list_users_does_not_expose_password_hash(): void
    {
        $this->createUser(['username' => 'secretuser']);

        $response = $this->getJson('/api/users');

        $response->assertStatus(200);

        $users = $response->json('data');
        foreach ($users as $user) {
            $this->assertArrayNotHasKey('password_hash', $user);
        }
    }

    public function test_list_users_returns_expected_fields(): void
    {
        $this->createUser(['username' => 'fielduser']);

        $response = $this->getJson('/api/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'username', 'role', 'is_active', 'created_at'],
                ],
            ]);
    }

    // =========================================================================
    // PATCH /api/users/{id}
    // =========================================================================

    public function test_update_user_password_returns_200_and_hashes_new_password(): void
    {
        $user = $this->createUser(['username' => 'pwuser']);

        $response = $this->patchJson("/api/users/{$user->id}", [
            'password' => 'newpass1',
        ]);

        $response->assertStatus(200);

        $user->refresh();
        $this->assertFalse(Hash::check('password123', $user->password_hash));
        $this->assertTrue(Hash::check('newpass1', $user->password_hash));
    }

    public function test_update_user_deactivation_returns_200_and_sets_is_active_false(): void
    {
        $user = $this->createUser(['username' => 'activeuser', 'is_active' => true]);

        $response = $this->patchJson("/api/users/{$user->id}", [
            'is_active' => false,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.is_active', false);

        $user->refresh();
        $this->assertFalse($user->is_active);
    }

    public function test_update_user_activation_returns_200_and_sets_is_active_true(): void
    {
        $user = $this->createUser(['username' => 'inactiveuser', 'is_active' => false]);

        $response = $this->patchJson("/api/users/{$user->id}", [
            'is_active' => true,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.is_active', true);

        $user->refresh();
        $this->assertTrue($user->is_active);
    }

    public function test_update_nonexistent_user_returns_404_user_not_found(): void
    {
        $response = $this->patchJson('/api/users/99999', [
            'password' => 'newpass1',
        ]);

        $response->assertStatus(404)
            ->assertJsonPath('error', 'user_not_found');
    }

    public function test_update_user_with_parent_role_returns_403_cannot_modify_parent(): void
    {
        $parent = $this->createUser([
            'username' => 'theparent',
            'role'     => 'parent',
        ]);

        $response = $this->patchJson("/api/users/{$parent->id}", [
            'password' => 'newpass1',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('error', 'cannot_modify_parent');
    }

    public function test_update_user_with_password_shorter_than_6_chars_returns_422_validation_error(): void
    {
        $user = $this->createUser(['username' => 'shortpwuser']);

        $response = $this->patchJson("/api/users/{$user->id}", [
            'password' => '12345',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'validation_error');
    }

    public function test_update_user_with_empty_body_returns_200_and_changes_nothing(): void
    {
        $user = $this->createUser(['username' => 'nothingchanged', 'is_active' => true]);
        $originalHash = $user->password_hash;

        $response = $this->patchJson("/api/users/{$user->id}", []);

        $response->assertStatus(200)
            ->assertJsonPath('data.username', 'nothingchanged')
            ->assertJsonPath('data.is_active', true);

        $user->refresh();
        $this->assertEquals($originalHash, $user->password_hash);
        $this->assertTrue($user->is_active);
    }
}
