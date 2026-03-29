<?php

namespace Tests\Feature\PrivateChat;

use App\Modules\Auth\Models\User;
use App\Modules\PrivateChat\Models\PrivateChat;
use App\Modules\PrivateChat\Models\PrivateChatMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PrivateChatMessagesTest extends TestCase
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

    private function createChat(User $a, User $b): int
    {
        $chat = PrivateChat::create(['created_at' => now()]);
        PrivateChatMember::create(['chat_id' => $chat->id, 'user_id' => $a->id, 'joined_at' => now()]);
        PrivateChatMember::create(['chat_id' => $chat->id, 'user_id' => $b->id, 'joined_at' => now()]);
        return $chat->id;
    }

    public function test_send_message_without_token_returns_401(): void
    {
        $this->postJson('/api/private-chats/1/messages', ['content' => 'Hi'])
            ->assertStatus(401);
    }

    public function test_non_member_cannot_send_message(): void
    {
        $alice  = $this->createUser(['username' => 'alice']);
        $bob    = $this->createUser(['username' => 'bob']);
        $carol  = $this->createUser(['username' => 'carol']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($carol);

        $this->postJson("/api/private-chats/{$chatId}/messages", ['content' => 'Hi'], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(403);
    }

    public function test_member_can_send_message(): void
    {
        Event::fake();
        $alice  = $this->createUser(['username' => 'alice2']);
        $bob    = $this->createUser(['username' => 'bob2']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($alice);

        $response = $this->postJson("/api/private-chats/{$chatId}/messages", ['content' => 'Hello Bob'], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.content', 'Hello Bob')
            ->assertJsonPath('data.username', 'alice2');

        $this->assertDatabaseHas('private_messages', [
            'chat_id' => $chatId,
            'content' => 'Hello Bob',
        ]);
    }

    public function test_send_message_returns_correct_structure(): void
    {
        Event::fake();
        $alice  = $this->createUser(['username' => 'alice3']);
        $bob    = $this->createUser(['username' => 'bob3']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($alice);

        $this->postJson("/api/private-chats/{$chatId}/messages", ['content' => 'Hi'], [
            'Authorization' => "Bearer {$token}",
        ])->assertJsonStructure([
            'data' => ['id', 'chat_id', 'user_id', 'username', 'is_bot', 'content', 'created_at'],
        ]);
    }

    public function test_empty_content_returns_422(): void
    {
        $alice  = $this->createUser(['username' => 'alice4']);
        $bob    = $this->createUser(['username' => 'bob4']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($alice);

        $this->postJson("/api/private-chats/{$chatId}/messages", ['content' => ''], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(422)->assertJsonPath('error', 'content_empty');
    }

    public function test_content_over_150_chars_returns_422(): void
    {
        $alice  = $this->createUser(['username' => 'alice5']);
        $bob    = $this->createUser(['username' => 'bob5']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($alice);

        $this->postJson("/api/private-chats/{$chatId}/messages", ['content' => str_repeat('a', 151)], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(422)->assertJsonPath('error', 'content_too_long');
    }

    public function test_antispam_blocks_second_message_within_one_second(): void
    {
        Event::fake();
        $alice  = $this->createUser(['username' => 'alice6']);
        $bob    = $this->createUser(['username' => 'bob6']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($alice);

        $this->postJson("/api/private-chats/{$chatId}/messages", ['content' => 'First'], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(201);

        $this->postJson("/api/private-chats/{$chatId}/messages", ['content' => 'Second'], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(429)->assertJsonPath('error', 'rate_limit_exceeded');
    }

    public function test_get_messages_without_token_returns_401(): void
    {
        $this->getJson('/api/private-chats/1/messages')->assertStatus(401);
    }

    public function test_non_member_cannot_get_messages(): void
    {
        $alice  = $this->createUser(['username' => 'alice7']);
        $bob    = $this->createUser(['username' => 'bob7']);
        $carol  = $this->createUser(['username' => 'carol7']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($carol);

        $this->getJson("/api/private-chats/{$chatId}/messages", [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(403);
    }

    public function test_member_can_get_messages(): void
    {
        Event::fake();
        $alice  = $this->createUser(['username' => 'alice8']);
        $bob    = $this->createUser(['username' => 'bob8']);
        $chatId = $this->createChat($alice, $bob);
        $token  = $this->authToken($alice);

        $this->postJson("/api/private-chats/{$chatId}/messages", ['content' => 'Hello'], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response = $this->getJson("/api/private-chats/{$chatId}/messages", [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.content', 'Hello');
    }

    public function test_bot_reply_dispatched_when_only_lulu_in_chat(): void
    {
        Queue::fake();
        $alice = $this->createUser(['username' => 'alice9']);
        $lulu  = User::create([
            'username'      => config('bot.name'),
            'password_hash' => Hash::make(\Str::random(32)),
            'role'          => 'child',
            'is_active'     => true,
            'is_bot'        => true,
        ]);
        $chatId = $this->createChat($alice, $lulu);
        $token  = $this->authToken($alice);

        $this->postJson("/api/private-chats/{$chatId}/messages", ['content' => 'Hello Lulu'], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(201);

        Queue::assertPushed(\App\Modules\Bot\Jobs\ProcessPrivateBotReply::class);
    }
}
