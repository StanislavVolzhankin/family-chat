<?php

namespace App\Modules\PrivateChat\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bot\Jobs\ProcessPrivateBotReply;
use App\Modules\PrivateChat\Events\PrivateChatMembersUpdated;
use App\Modules\PrivateChat\Services\PrivateChatMessageService;
use App\Modules\PrivateChat\Services\PrivateChatService;
use Illuminate\Http\Request;

class PrivateChatController extends Controller
{
    public function __construct(
        private PrivateChatService $chatService,
        private PrivateChatMessageService $messageService,
    ) {}

    /**
     * POST /api/private-chats
     * Get or create a private chat with another user.
     */
    public function getOrCreate(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        $otherUserId = (int) $request->input('other_user_id', 0);

        if (! $otherUserId) {
            $otherUsername = (string) $request->input('other_username', '');
            if ($otherUsername) {
                $found = \App\Modules\Auth\Models\User::where('username', $otherUsername)->value('id');
                $otherUserId = (int) $found;
            }
        }

        if (! $otherUserId) {
            return response()->json(['error' => 'other_user_required'], 422);
        }

        try {
            $result = $this->chatService->getOrCreate($user->id, $otherUserId);
        } catch (\InvalidArgumentException $e) {
            $code = $e->getMessage();
            $status = match ($code) {
                'user_not_found' => 404,
                default          => 422,
            };
            return response()->json(['error' => $code], $status);
        }

        $httpStatus = $result['created'] ? 201 : 200;
        unset($result['created']);

        return response()->json(['data' => $result], $httpStatus);
    }

    /**
     * GET /api/private-chats
     * List all private chats for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        $chats = $this->chatService->getChatsForUser($user->id);

        return response()->json(['data' => $chats]);
    }

    /**
     * GET /api/private-chats/{chatId}/messages
     * Get message history for a private chat.
     */
    public function messages(Request $request, int $chatId)
    {
        $user = $request->attributes->get('auth_user');

        if (! $this->chatService->isMember($chatId, $user->id)) {
            return response()->json(['error' => 'forbidden'], 403);
        }

        $messages = $this->messageService->getHistory($chatId);

        return response()->json(['data' => $messages]);
    }

    /**
     * POST /api/private-chats/{chatId}/messages
     * Send a message to a private chat.
     */
    public function sendMessage(Request $request, int $chatId)
    {
        $user = $request->attributes->get('auth_user');

        if (! $this->chatService->isMember($chatId, $user->id)) {
            return response()->json(['error' => 'forbidden'], 403);
        }

        $content = (string) $request->input('content', '');

        try {
            $message = $this->messageService->store($chatId, $user->id, $content);
        } catch (\InvalidArgumentException $e) {
            $code = $e->getMessage();
            $status = match ($code) {
                'rate_limit_exceeded' => 429,
                default               => 422,
            };
            return response()->json(['error' => $code], $status);
        }

        // Dispatch bot reply if needed (M13.7)
        $this->dispatchBotIfNeeded($chatId, $content);

        return response()->json(['data' => $message], 201);
    }

    /**
     * POST /api/private-chats/{chatId}/members
     * Add Lulu to the chat.
     */
    public function addLulu(Request $request, int $chatId)
    {
        $user = $request->attributes->get('auth_user');

        if (! $this->chatService->isMember($chatId, $user->id)) {
            return response()->json(['error' => 'forbidden'], 403);
        }

        try {
            $result = $this->chatService->addLulu($chatId);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        broadcast(new PrivateChatMembersUpdated($chatId, $result['members']));

        return response()->json(['data' => $result]);
    }

    /**
     * DELETE /api/private-chats/{chatId}/members/lulu
     * Remove Lulu from the chat.
     */
    public function removeLulu(Request $request, int $chatId)
    {
        $user = $request->attributes->get('auth_user');

        if (! $this->chatService->isMember($chatId, $user->id)) {
            return response()->json(['error' => 'forbidden'], 403);
        }

        try {
            $result = $this->chatService->removeLulu($chatId);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        broadcast(new PrivateChatMembersUpdated($chatId, $result['members']));

        return response()->json(['data' => $result]);
    }

    private function dispatchBotIfNeeded(int $chatId, string $content): void
    {
        $ctx = $this->chatService->getBotDispatchContext($chatId);
        if (! $ctx) {
            return;
        }

        // 2 members = auth user + Lulu only → always reply
        // 3+ members → only on @BotName mention
        $alwaysReply = $ctx['member_count'] === 2;

        if ($alwaysReply || str_contains($content, '@' . config('bot.name'))) {
            ProcessPrivateBotReply::dispatch($content, $ctx['bot_user_id'], $chatId);
        }
    }
}
