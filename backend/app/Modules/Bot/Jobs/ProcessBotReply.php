<?php

namespace App\Modules\Bot\Jobs;

use App\Modules\Bot\Services\BotService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessBotReply implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $question,
        private readonly int    $botUserId,
    ) {}

    public function handle(BotService $botService): void
    {
        $botService->reply($this->question, $this->botUserId);
    }
}
