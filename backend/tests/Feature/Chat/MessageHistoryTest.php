<?php

namespace Tests\Feature\Chat;

use App\Modules\Auth\Models\User;
use App\Modules\Chat\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MessageHistoryTest extends TestCase
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

    private function authToken(User $user): string
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => $user->username,
            'password' => 'password',
        ]);
        return $response->json('data.access_token');
    }

    public function test_get_messages_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/messages');
        $response->assertStatus(401);
    }

    public function test_get_messages_returns_empty_array_when_no_messages(): void
    {
        $user = $this->createUser();
        $token = $this->authToken($user);

        $response = $this->getJson('/api/messages', [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(200)
            ->assertJson(['data' => []]);
    }

    public function test_get_messages_returns_messages_with_correct_structure(): void
    {
        $user = $this->createUser(['username' => 'alice']);
        $token = $this->authToken($user);

        Message::create([
            'user_id'    => $user->id,
            'content'    => 'Hello world',
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/messages', [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'user_id', 'username', 'content', 'created_at'],
                ],
            ])
            ->assertJsonPath('data.0.username', 'alice')
            ->assertJsonPath('data.0.content', 'Hello world');
    }

    public function test_get_messages_does_not_return_messages_older_than_30_days(): void
    {
        $user = $this->createUser();
        $token = $this->authToken($user);

        Message::create([
            'user_id'    => $user->id,
            'content'    => 'Old message',
            'created_at' => now()->subDays(31),
        ]);

        Message::create([
            'user_id'    => $user->id,
            'content'    => 'Recent message',
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/messages', [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Recent message', $data[0]['content']);
    }

    public function test_get_messages_returns_messages_sorted_by_created_at_asc(): void
    {
        $user = $this->createUser();
        $token = $this->authToken($user);

        Message::create([
            'user_id'    => $user->id,
            'content'    => 'Second',
            'created_at' => now(),
        ]);
        Message::create([
            'user_id'    => $user->id,
            'content'    => 'First',
            'created_at' => now()->subMinutes(5),
        ]);

        $response = $this->getJson('/api/messages', [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals('First', $data[0]['content']);
        $this->assertEquals('Second', $data[1]['content']);
    }
}
