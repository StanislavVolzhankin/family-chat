<?php

namespace App\Modules\Bot\Providers;

use App\Modules\Bot\Contracts\LlmProvider;

class OpenAiProvider implements LlmProvider
{
    public function chat(string $question): string
    {
        $client = \OpenAI::client(config('bot.openai_key'));

        $response = $client->chat()->create([
            'model'    => config('bot.openai_model'),
            'messages' => [
                ['role' => 'system', 'content' => config('bot.system_prompt')],
                ['role' => 'user',   'content' => $question],
            ],
        ]);

        return $response->choices[0]->message->content;
    }
}
