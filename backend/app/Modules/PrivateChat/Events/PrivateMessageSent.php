<?php

namespace App\Modules\PrivateChat\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class PrivateMessageSent implements ShouldBroadcastNow
{
    public function __construct(
        public readonly int    $id,
        public readonly int    $chat_id,
        public readonly int    $user_id,
        public readonly string $username,
        public readonly bool   $is_bot,
        public readonly string $content,
        public readonly string $created_at,
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('private-chat.' . $this->chat_id);
    }

    public function broadcastAs(): string
    {
        return 'new_private_message';
    }
}
