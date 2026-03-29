<?php

namespace Tests\Feature\PrivateChat;

use App\Modules\Auth\Models\User;
use App\Modules\PrivateChat\Models\PrivateChat;
use App\Modules\PrivateChat\Models\PrivateChatMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PrivateChatMembersTest extends TestCase
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

    private function createBot(): User
    {
        return User::create([
            'username'      => config('bot.name'),
            'password_hash' => Hash::make(\Str::random(32)),
            'role'          => 'child',
            'is_active'     => true,
            'is_bot'        => true,
        ]);
    }

    private function authToken(User $user): string
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => $user->username,
            'password' => 'password',
        ]);
        return $response->json('data.access_token');
    }

    private function createChat(User $a, User $b): int
    {
        $chat = PrivateChat::create(['created_at' => now()]);
        PrivateChatMember::create(['chat_id' => $chat->id, 'user_id' => $a->id, 'joined_at' => now()]);
        PrivateChatMember::create(['chat_id' => $chat->id, 'user_id' => $b->id, 'joined_at' => now()]);
        return $chat->id;
    }

    public function test_add_lulu_without_token_returns_401(): void
    {
        $this->postJson('/api/private-chats/1/members')->assertStatus(401);
    }

    public function test_non_member_cannot_add_lulu(): void
    {
        $this->createBot();
        $alice  = $this->createUser(['username' => 'alice']);
        $bob    = $this->createUser(['username' => 'bob']);
        $carol  = $this->createUser(['username' => 'carol']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($carol);

        $this->postJson("/api/private-chats/{$chatId}/members", [], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(403);
    }

    public function test_member_can_add_lulu(): void
    {
        Event::fake();
        $this->createBot();
        $alice  = $this->createUser(['username' => 'alice2']);
        $bob    = $this->createUser(['username' => 'bob2']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($alice);

        $response = $this->postJson("/api/private-chats/{$chatId}/members", [], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(200);
        $members = $response->json('data.members');
        $this->assertCount(3, $members);
        $this->assertTrue(collect($members)->contains('is_bot', true));
    }

    public function test_add_lulu_twice_returns_422(): void
    {
        Event::fake();
        $this->createBot();
        $alice  = $this->createUser(['username' => 'alice3']);
        $bob    = $this->createUser(['username' => 'bob3']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($alice);

        $this->postJson("/api/private-chats/{$chatId}/members", [], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(200);

        $this->postJson("/api/private-chats/{$chatId}/members", [], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(422);
    }

    public function test_remove_lulu_without_token_returns_401(): void
    {
        $this->deleteJson('/api/private-chats/1/members/lulu')->assertStatus(401);
    }

    public function test_non_member_cannot_remove_lulu(): void
    {
        Event::fake();
        $lulu   = $this->createBot();
        $alice  = $this->createUser(['username' => 'alice4']);
        $bob    = $this->createUser(['username' => 'bob4']);
        $carol  = $this->createUser(['username' => 'carol4']);
        $chatId = $this->createChat($alice, $bob);
        PrivateChatMember::create(['chat_id' => $chatId, 'user_id' => $lulu->id, 'joined_at' => now()]);
        $token = $this->authToken($carol);

        $this->deleteJson("/api/private-chats/{$chatId}/members/lulu", [], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(403);
    }

    public function test_member_can_remove_lulu(): void
    {
        Event::fake();
        $lulu   = $this->createBot();
        $alice  = $this->createUser(['username' => 'alice5']);
        $bob    = $this->createUser(['username' => 'bob5']);
        $chatId = $this->createChat($alice, $bob);
        PrivateChatMember::create(['chat_id' => $chatId, 'user_id' => $lulu->id, 'joined_at' => now()]);
        $token = $this->authToken($alice);

        $response = $this->deleteJson("/api/private-chats/{$chatId}/members/lulu", [], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(200);
        $members = $response->json('data.members');
        $this->assertFalse(collect($members)->contains('is_bot', true));
    }

    public function test_remove_lulu_when_not_in_chat_returns_422(): void
    {
        $this->createBot();
        $alice  = $this->createUser(['username' => 'alice6']);
        $bob    = $this->createUser(['username' => 'bob6']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($alice);

        $this->deleteJson("/api/private-chats/{$chatId}/members/lulu", [], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(422);
    }
}
