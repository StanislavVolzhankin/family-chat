<?php

namespace App\Modules\PrivateChat\Services;

use App\Modules\Auth\Models\User;
use App\Modules\PrivateChat\Events\PrivateMessageSent;
use App\Modules\PrivateChat\Models\PrivateChatMember;
use App\Modules\PrivateChat\Models\PrivateMessage;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class PrivateChatMessageService
{
    public function getHistory(int $chatId, int $days = 30): array
    {
        return PrivateMessage::query()
            ->join('users', 'private_messages.user_id', '=', 'users.id')
            ->where('private_messages.chat_id', $chatId)
            ->where('private_messages.created_at', '>=', now()->subDays($days))
            ->orderBy('private_messages.created_at', 'asc')
            ->select([
                'private_messages.id',
                'private_messages.chat_id',
                'private_messages.user_id',
                'users.username',
                'users.is_bot',
                'private_messages.content',
                'private_messages.created_at',
            ])
            ->get()
            ->map(fn($m) => [
                'id'         => $m->id,
                'chat_id'    => $m->chat_id,
                'user_id'    => $m->user_id,
                'username'   => $m->username,
                'is_bot'     => (bool) $m->is_bot,
                'content'    => $m->content,
                'created_at' => Carbon::parse($m->created_at)->toISOString(),
            ])
            ->toArray();
    }

    public function store(int $chatId, int $userId, string $content): array
    {
        $content = trim($content);

        if ($content === '') {
            throw new \InvalidArgumentException('content_empty');
        }

        if (mb_strlen($content) > 150) {
            throw new \InvalidArgumentException('content_too_long');
        }

        // Shared antispam key — applies across all chats
        $cacheKey = "antispam:user:{$userId}";
        if (Cache::has($cacheKey)) {
            throw new \InvalidArgumentException('rate_limit_exceeded');
        }
        Cache::put($cacheKey, true, now()->addSecond());

        $message = PrivateMessage::create([
            'chat_id'    => $chatId,
            'user_id'    => $userId,
            'content'    => $content,
            'created_at' => now(),
        ]);

        $user = User::find($userId);

        $payload = [
            'id'         => $message->id,
            'chat_id'    => $chatId,
            'user_id'    => $userId,
            'username'   => $user->username,
            'is_bot'     => (bool) $user->is_bot,
            'content'    => $content,
            'created_at' => Carbon::parse($message->created_at)->toISOString(),
        ];

        broadcast(new PrivateMessageSent(...$payload));

        return $payload;
    }

    /**
     * Store a bot reply message and broadcast it (called from Job).
     */
    public function storeBotMessage(int $chatId, int $botUserId, string $content): void
    {
        $message = PrivateMessage::create([
            'chat_id'    => $chatId,
            'user_id'    => $botUserId,
            'content'    => $content,
            'created_at' => now(),
        ]);

        $bot = User::find($botUserId);

        broadcast(new PrivateMessageSent(
            id:         $message->id,
            chat_id:    $chatId,
            user_id:    $botUserId,
            username:   $bot->username,
            is_bot:     true,
            content:    $content,
            created_at: Carbon::parse($message->created_at)->toISOString(),
        ));
    }

    /**
     * Get members of a chat with their user info.
     */
    public function getMembers(int $chatId): array
    {
        return PrivateChatMember::where('chat_id', $chatId)
            ->with('user')
            ->get()
            ->map(fn($m) => [
                'id'     => $m->user->id,
                'is_bot' => (bool) $m->user->is_bot,
            ])
            ->toArray();
    }
}
