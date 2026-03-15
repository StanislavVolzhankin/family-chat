<?php

namespace Tests\Feature\Chat;

use App\Modules\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PresenceChannelAuthTest extends TestCase
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

    public function test_presence_channel_auth_returns_user_data(): void
    {
        $user = $this->createUser(['username' => 'alice']);

        $response = $this->actingAs($user)
            ->postJson('/broadcasting/auth', [
                'channel_name' => 'presence-chat',
                'socket_id'    => '123.456',
            ]);

        $response->assertStatus(200);

        $auth = $response->json();
        $channelData = json_decode($auth['channel_data'], true);

        $this->assertEquals($user->id, $channelData['user_id']);
        $this->assertArrayHasKey('user_info', $channelData);
        $this->assertEquals('alice', $channelData['user_info']['username']);
        $this->assertFalse((bool) $channelData['user_info']['is_bot']);
    }

    public function test_presence_channel_auth_without_token_returns_403(): void
    {
        $response = $this->postJson('/broadcasting/auth', [
            'channel_name' => 'presence-chat',
            'socket_id'    => '123.456',
        ]);

        $response->assertStatus(403);
    }

    public function test_presence_channel_auth_returns_is_bot_true_for_bot_user(): void
    {
        $bot = $this->createUser(['username' => 'Lulu', 'is_bot' => true, 'role' => 'child']);
        // Bots cannot log in — test channel callback directly via actingAs
        $response = $this->actingAs($bot)
            ->postJson('/broadcasting/auth', [
                'channel_name' => 'presence-chat',
                'socket_id'    => '123.456',
            ]);

        $response->assertStatus(200);

        $auth = $response->json();
        $channelData = json_decode($auth['channel_data'], true);

        $this->assertTrue((bool) $channelData['user_info']['is_bot']);
    }
}
