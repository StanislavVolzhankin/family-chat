<?php

namespace App\Modules\PrivateChat\Services;

use App\Modules\Auth\Models\User;
use App\Modules\PrivateChat\Models\PrivateChat;
use App\Modules\PrivateChat\Models\PrivateChatMember;

class PrivateChatService
{
    /**
     * Get or create a private chat between two users.
     */
    public function getOrCreate(int $authUserId, int $otherUserId): array
    {
        if ($authUserId === $otherUserId) {
            throw new \InvalidArgumentException('cannot_chat_with_self');
        }

        $otherUser = User::where('id', $otherUserId)->where('is_active', true)->first();
        if (! $otherUser) {
            throw new \InvalidArgumentException('user_not_found');
        }

        // Find existing chat where both users are members
        $chatId = PrivateChatMember::where('user_id', $authUserId)
            ->whereIn('chat_id',
                PrivateChatMember::where('user_id', $otherUserId)->pluck('chat_id')
            )
            ->value('chat_id');

        if ($chatId) {
            $chat = PrivateChat::find($chatId);
            return [
                'chat_id' => $chat->id,
                'members' => $this->formatMembers($chatId),
                'created' => false,
            ];
        }

        // Create new chat
        $chat = PrivateChat::create(['created_at' => now()]);
        PrivateChatMember::create(['chat_id' => $chat->id, 'user_id' => $authUserId, 'joined_at' => now()]);
        PrivateChatMember::create(['chat_id' => $chat->id, 'user_id' => $otherUserId, 'joined_at' => now()]);

        return [
            'chat_id' => $chat->id,
            'members' => $this->formatMembers($chat->id),
            'created' => true,
        ];
    }

    /**
     * Get all private chats for a user with member info.
     */
    public function getChatsForUser(int $userId): array
    {
        $chatIds = PrivateChatMember::where('user_id', $userId)->pluck('chat_id');

        return PrivateChat::whereIn('id', $chatIds)
            ->get()
            ->map(fn($chat) => [
                'chat_id' => $chat->id,
                'members' => $this->formatMembers($chat->id),
            ])
            ->toArray();
    }

    /**
     * Add Lulu to a chat.
     */
    public function addLulu(int $chatId): array
    {
        $lulu = User::where('is_bot', true)->first();
        if (! $lulu) {
            throw new \InvalidArgumentException('bot_not_found');
        }

        $alreadyMember = PrivateChatMember::where('chat_id', $chatId)
            ->where('user_id', $lulu->id)
            ->exists();

        if ($alreadyMember) {
            throw new \InvalidArgumentException('lulu_already_in_chat');
        }

        PrivateChatMember::create(['chat_id' => $chatId, 'user_id' => $lulu->id, 'joined_at' => now()]);

        return [
            'chat_id' => $chatId,
            'members' => $this->formatMembers($chatId),
        ];
    }

    /**
     * Remove Lulu from a chat.
     */
    public function removeLulu(int $chatId): array
    {
        $lulu = User::where('is_bot', true)->first();
        if (! $lulu) {
            throw new \InvalidArgumentException('bot_not_found');
        }

        $member = PrivateChatMember::where('chat_id', $chatId)
            ->where('user_id', $lulu->id)
            ->first();

        if (! $member) {
            throw new \InvalidArgumentException('lulu_not_in_chat');
        }

        $member->delete();

        return [
            'chat_id' => $chatId,
            'members' => $this->formatMembers($chatId),
        ];
    }

    /**
     * Return bot user id and total member count if bot is in the chat, null otherwise.
     * Used by the controller to decide whether to dispatch ProcessPrivateBotReply.
     */
    public function getBotDispatchContext(int $chatId): ?array
    {
        $lulu = User::where('is_bot', true)->first();
        if (! $lulu) {
            return null;
        }

        $isMember = PrivateChatMember::where('chat_id', $chatId)
            ->where('user_id', $lulu->id)
            ->exists();

        if (! $isMember) {
            return null;
        }

        $memberCount = PrivateChatMember::where('chat_id', $chatId)->count();

        return [
            'bot_user_id'  => $lulu->id,
            'member_count' => $memberCount,
        ];
    }

    /**
     * Check if user is a member of the chat.
     */
    public function isMember(int $chatId, int $userId): bool
    {
        return PrivateChatMember::where('chat_id', $chatId)
            ->where('user_id', $userId)
            ->exists();
    }

    public function formatMembers(int $chatId): array
    {
        return PrivateChatMember::where('chat_id', $chatId)
            ->with('user')
            ->get()
            ->map(fn($m) => [
                'id'       => $m->user->id,
                'username' => $m->user->username,
                'is_bot'   => (bool) $m->user->is_bot,
            ])
            ->toArray();
    }
}
