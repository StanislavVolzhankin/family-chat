<?php

namespace Tests\Feature\Chat;

use App\Modules\Auth\Models\User;
use App\Modules\Chat\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SendMessageTest extends TestCase
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

    public function test_send_message_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/messages', ['content' => 'Hello']);
        $response->assertStatus(401);
    }

    public function test_send_message_creates_record_in_db(): void
    {
        Event::fake();

        $user = $this->createUser(['username' => 'alice']);
        $token = $this->authToken($user);

        $response = $this->postJson('/api/messages', ['content' => 'Hello world'], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.content', 'Hello world')
            ->assertJsonPath('data.username', 'alice');

        $this->assertDatabaseHas('messages', [
            'user_id' => $user->id,
            'content' => 'Hello world',
        ]);
    }

    public function test_send_message_returns_correct_structure(): void
    {
        Event::fake();

        $user = $this->createUser(['username' => 'bob']);
        $token = $this->authToken($user);

        $response = $this->postJson('/api/messages', ['content' => 'Hi there'], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['id', 'user_id', 'username', 'content', 'created_at'],
            ]);
    }

    public function test_send_empty_content_returns_422(): void
    {
        $user = $this->createUser();
        $token = $this->authToken($user);

        $response = $this->postJson('/api/messages', ['content' => ''], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'content_empty');
    }

    public function test_send_whitespace_only_returns_422(): void
    {
        $user = $this->createUser();
        $token = $this->authToken($user);

        $response = $this->postJson('/api/messages', ['content' => '   '], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'content_empty');
    }

    public function test_send_message_longer_than_150_chars_returns_422(): void
    {
        $user = $this->createUser();
        $token = $this->authToken($user);

        $response = $this->postJson('/api/messages', ['content' => str_repeat('a', 151)], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'content_too_long');
    }

    public function test_send_message_exactly_150_chars_succeeds(): void
    {
        Event::fake();

        $user = $this->createUser();
        $token = $this->authToken($user);

        $response = $this->postJson('/api/messages', ['content' => str_repeat('a', 150)], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(201);
    }

    public function test_antispam_second_message_within_one_second_returns_429(): void
    {
        Event::fake();

        $user = $this->createUser();
        $token = $this->authToken($user);

        $this->postJson('/api/messages', ['content' => 'First'], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(201);

        $response = $this->postJson('/api/messages', ['content' => 'Second'], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(429)
            ->assertJsonPath('error', 'rate_limit_exceeded');
    }

    public function test_antispam_allows_message_after_cache_expires(): void
    {
        Event::fake();

        $user = $this->createUser();
        $token = $this->authToken($user);

        Cache::put("antispam:user:{$user->id}", true, now()->subSecond());

        $response = $this->postJson('/api/messages', ['content' => 'After cooldown'], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(201);
    }

    public function test_different_users_are_not_rate_limited_by_each_other(): void
    {
        Event::fake();

        $user1 = $this->createUser(['username' => 'user1']);
        $user2 = $this->createUser(['username' => 'user2']);
        $token1 = $this->authToken($user1);
        $token2 = $this->authToken($user2);

        $this->postJson('/api/messages', ['content' => 'From user1'], [
            'Authorization' => "Bearer {$token1}",
        ])->assertStatus(201);

        $this->postJson('/api/messages', ['content' => 'From user2'], [
            'Authorization' => "Bearer {$token2}",
        ])->assertStatus(201);
    }
}
