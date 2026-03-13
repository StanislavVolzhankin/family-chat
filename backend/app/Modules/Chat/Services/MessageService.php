<?php

namespace App\Modules\Chat\Services;

use App\Modules\Chat\Models\Message;

class MessageService
{
    public function getHistory(int $days = 30): array
    {
        return Message::query()
            ->join('users', 'messages.user_id', '=', 'users.id')
            ->where('messages.created_at', '>=', now()->subDays($days))
            ->orderBy('messages.created_at', 'asc')
            ->select([
                'messages.id',
                'messages.user_id',
                'users.username',
                'messages.content',
                'messages.created_at',
            ])
            ->get()
            ->map(fn($m) => [
                'id'         => $m->id,
                'user_id'    => $m->user_id,
                'username'   => $m->username,
                'content'    => $m->content,
                'created_at' => $m->created_at,
            ])
            ->toArray();
    }
}
