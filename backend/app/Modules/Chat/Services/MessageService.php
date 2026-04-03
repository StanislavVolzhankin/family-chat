<?php

namespace App\Modules\Chat\Services;

use App\Modules\Chat\Events\MessageSent;
use App\Modules\Chat\Models\Message;
use Illuminate\Support\Facades\Cache;

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
                'users.is_bot',
                'messages.content',
                'messages.created_at',
            ])
            ->get()
            ->map(fn($m) => [
                'id'         => $m->id,
                'user_id'    => $m->user_id,
                'username'   => $m->username,
                'is_bot'     => (bool) $m->is_bot,
                'content'    => $m->content,
                'created_at' => \Carbon\Carbon::parse($m->created_at)->toISOString(),
            ])
            ->toArray();
    }

    public function store(int $userId, string $content): array
    {
        $content = trim($content);

        if ($content === '') {
            throw new \InvalidArgumentException('content_empty');
        }

        if (mb_strlen($content) > 150) {
            throw new \InvalidArgumentException('content_too_long');
        }

        $cacheKey = "antispam:user:{$userId}";

        if (Cache::has($cacheKey)) {
            throw new \InvalidArgumentException('rate_limit_exceeded');
        }

        Cache::put($cacheKey, true, now()->addSecond());

        $message = Message::create([
            'user_id'    => $userId,
            'content'    => $content,
            'created_at' => now(),
        ]);

        $user = $message->user()->first();

        $payload = [
            'id'         => $message->id,
            'user_id'    => $message->user_id,
            'username'   => $user->username,
            'is_bot'     => (bool) $user->is_bot,
            'content'    => $message->content,
            'created_at' => \Carbon\Carbon::parse($message->created_at)->toISOString(),
        ];

        broadcast(new MessageSent(...$payload));

        return $payload;
    }
}
