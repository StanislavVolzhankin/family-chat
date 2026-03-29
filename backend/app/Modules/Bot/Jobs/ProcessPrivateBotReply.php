<?php

namespace App\Modules\Bot\Jobs;

use App\Modules\Bot\Contracts\LlmProvider;
use App\Modules\PrivateChat\Services\PrivateChatMessageService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessPrivateBotReply implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $question,
        private readonly int    $botUserId,
        private readonly int    $chatId,
    ) {}

    public function handle(LlmProvider $llm, PrivateChatMessageService $messageService): void
    {
        try {
            $content = $llm->chat($this->question);
        } catch (\Throwable) {
            $content = config('bot.unavailable_message');
        }

        $messageService->storeBotMessage($this->chatId, $this->botUserId, $content);
    }
}
