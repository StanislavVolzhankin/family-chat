<?php

namespace Tests\Feature\PrivateChat;

use App\Modules\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PrivateChatCreateTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(array $overrides = []): User
    {
        static $counter = 0;
        $counter++;
        return User::create(array_merge([
            'username'      => "user{$counter}",
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

    public function test_create_chat_without_token_returns_401(): void
    {
        $other = $this->createUser();
        $this->postJson('/api/private-chats', ['other_user_id' => $other->id])
            ->assertStatus(401);
    }

    public function test_create_chat_returns_chat_with_members(): void
    {
        Event::fake();
        $alice = $this->createUser(['username' => 'alice']);
        $bob   = $this->createUser(['username' => 'bob']);
        $token = $this->authToken($alice);

        $response = $this->postJson('/api/private-chats', ['other_user_id' => $bob->id], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['chat_id', 'members']]);

        $members = $response->json('data.members');
        $usernames = array_column($members, 'username');
        $this->assertContains('alice', $usernames);
        $this->assertContains('bob', $usernames);
    }

    public function test_create_chat_twice_returns_existing_chat(): void
    {
        Event::fake();
        $alice = $this->createUser(['username' => 'alice2']);
        $bob   = $this->createUser(['username' => 'bob2']);
        $token = $this->authToken($alice);

        $first = $this->postJson('/api/private-chats', ['other_user_id' => $bob->id], [
            'Authorization' => "Bearer {$token}",
        ])->json('data.chat_id');

        $second = $this->postJson('/api/private-chats', ['other_user_id' => $bob->id], [
            'Authorization' => "Bearer {$token}",
        ]);

        $second->assertStatus(200)
            ->assertJsonPath('data.chat_id', $first);
    }

    public function test_cannot_create_chat_with_self(): void
    {
        $alice = $this->createUser(['username' => 'alice3']);
        $token = $this->authToken($alice);

        $this->postJson('/api/private-chats', ['other_user_id' => $alice->id], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(422);
    }

    public function test_cannot_create_chat_with_inactive_user(): void
    {
        $alice = $this->createUser(['username' => 'alice4']);
        $bob   = $this->createUser(['username' => 'bob4', 'is_active' => false]);
        $token = $this->authToken($alice);

        $this->postJson('/api/private-chats', ['other_user_id' => $bob->id], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(404);
    }

    public function test_get_chats_list_returns_only_own_chats(): void
    {
        Event::fake();
        $alice = $this->createUser(['username' => 'alice5']);
        $bob   = $this->createUser(['username' => 'bob5']);
        $carol = $this->createUser(['username' => 'carol5']);
        $tokenAlice = $this->authToken($alice);
        $tokenBob   = $this->authToken($bob);

        // alice creates chat with bob
        $this->postJson('/api/private-chats', ['other_user_id' => $bob->id], [
            'Authorization' => "Bearer {$tokenAlice}",
        ]);
        // bob creates chat with carol
        $this->postJson('/api/private-chats', ['other_user_id' => $carol->id], [
            'Authorization' => "Bearer {$tokenBob}",
        ]);

        $response = $this->getJson('/api/private-chats', [
            'Authorization' => "Bearer {$tokenAlice}",
        ]);

        $response->assertStatus(200);
        $chats = $response->json('data');
        $this->assertCount(1, $chats);
    }

    public function test_get_chats_list_without_token_returns_401(): void
    {
        $this->getJson('/api/private-chats')->assertStatus(401);
    }
}
