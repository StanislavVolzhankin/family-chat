<?php

namespace App\Modules\Chat\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class MessageSent implements ShouldBroadcastNow
{
    public function __construct(
        public readonly int    $id,
        public readonly int    $user_id,
        public readonly string $username,
        public readonly string $content,
        public readonly string $created_at,
        public readonly bool   $is_bot = false,
    ) {}

    public function broadcastOn(): Channel
    {
        return new PresenceChannel('chat');
    }

    public function broadcastAs(): string
    {
        return 'new_message';
    }
}
