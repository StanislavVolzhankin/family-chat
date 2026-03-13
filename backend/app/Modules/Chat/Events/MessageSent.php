<?php

namespace App\Modules\Chat\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class MessageSent implements ShouldBroadcast
{
    public function __construct(
        public readonly int    $id,
        public readonly int    $user_id,
        public readonly string $username,
        public readonly string $content,
        public readonly string $created_at,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel('chat');
    }

    public function broadcastAs(): string
    {
        return 'new_message';
    }
}
