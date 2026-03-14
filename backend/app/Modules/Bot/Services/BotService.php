<?php

namespace App\Modules\Bot\Services;

use App\Modules\Auth\Models\User;
use App\Modules\Bot\Jobs\ProcessBotReply;
use App\Modules\Chat\Events\MessageSent;
use App\Modules\Chat\Models\Message;
use Carbon\Carbon;

class BotService
{
    public function detect(string $content): bool
    {
        return str_contains($content, '@' . config('bot.name'));
    }

    public function dispatchIfNeeded(string $content): void
    {
        if (! $this->detect($content)) {
            return;
        }

        $bot = User::where('is_bot', true)->first();

        if ($bot) {
            ProcessBotReply::dispatch($content, $bot->id);
        }
    }

    public function reply(string $question, int $botUserId): void
    {
        $content = $this->fetchReply($question);

        $message = Message::create([
            'user_id'    => $botUserId,
            'content'    => $content,
            'created_at' => now(),
        ]);

        $bot = User::find($botUserId);

        broadcast(new MessageSent(
            id:         $message->id,
            user_id:    $message->user_id,
            username:   $bot->username,
            content:    $message->content,
            created_at: Carbon::parse($message->created_at)->toISOString(),
            is_bot:     true,
        ));
    }

    protected function fetchReply(string $question): string
    {
        try {
            $client = \OpenAI::client(config('bot.openai_key'));

            $response = $client->chat()->create([
                'model'    => config('bot.openai_model'),
                'messages' => [
                    ['role' => 'system', 'content' => config('bot.system_prompt')],
                    ['role' => 'user',   'content' => $question],
                ],
            ]);

            return $response->choices[0]->message->content;
        } catch (\Throwable) {
            return config('bot.unavailable_message');
        }
    }
}
