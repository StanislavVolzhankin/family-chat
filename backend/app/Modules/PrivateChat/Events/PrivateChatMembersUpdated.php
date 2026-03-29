<?php

namespace App\Modules\PrivateChat\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class PrivateChatMembersUpdated implements ShouldBroadcastNow
{
    public function __construct(
        public readonly int   $chat_id,
        public readonly array $members,
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('private-chat.' . $this->chat_id);
    }

    public function broadcastAs(): string
    {
        return 'chat_members_updated';
    }
}
