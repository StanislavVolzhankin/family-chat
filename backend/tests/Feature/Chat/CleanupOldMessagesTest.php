<?php

namespace Tests\Feature\Chat;

use App\Modules\Auth\Models\User;
use App\Modules\Chat\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CleanupOldMessagesTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(): User
    {
        return User::create([
            'username'      => 'testuser',
            'password_hash' => Hash::make('password'),
            'role'          => 'child',
            'is_active'     => true,
        ]);
    }

    public function test_deletes_messages_older_than_30_days(): void
    {
        $user = $this->createUser();

        Message::create([
            'user_id'    => $user->id,
            'content'    => 'Old message',
            'created_at' => now()->subDays(31),
        ]);

        $this->artisan('chat:cleanup-old-messages')->assertSuccessful();

        $this->assertDatabaseCount('messages', 0);
    }

    public function test_does_not_delete_messages_within_30_days(): void
    {
        $user = $this->createUser();

        Message::create([
            'user_id'    => $user->id,
            'content'    => 'Recent message',
            'created_at' => now()->subDays(29),
        ]);

        $this->artisan('chat:cleanup-old-messages')->assertSuccessful();

        $this->assertDatabaseCount('messages', 1);
    }

    public function test_works_when_no_old_messages_exist(): void
    {
        $user = $this->createUser();

        Message::create([
            'user_id'    => $user->id,
            'content'    => 'Recent message',
            'created_at' => now(),
        ]);

        $this->artisan('chat:cleanup-old-messages')->assertSuccessful();

        $this->assertDatabaseCount('messages', 1);
    }

    public function test_deletes_only_old_messages_and_keeps_recent(): void
    {
        $user = $this->createUser();

        Message::create([
            'user_id'    => $user->id,
            'content'    => 'Old',
            'created_at' => now()->subDays(31),
        ]);
        Message::create([
            'user_id'    => $user->id,
            'content'    => 'Recent',
            'created_at' => now(),
        ]);

        $this->artisan('chat:cleanup-old-messages')->assertSuccessful();

        $this->assertDatabaseCount('messages', 1);
        $this->assertDatabaseHas('messages', ['content' => 'Recent']);
        $this->assertDatabaseMissing('messages', ['content' => 'Old']);
    }
}
