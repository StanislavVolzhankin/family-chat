<?php

namespace App\Modules\Bot\Providers;

use App\Modules\Bot\Contracts\LlmProvider;
use Illuminate\Support\Facades\Http;

class GeminiProvider implements LlmProvider
{
    public function chat(string $question): string
    {
        $model = config('bot.gemini_model');
        $key   = config('bot.gemini_key');

        $response = Http::post(
            "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$key}",
            [
                'systemInstruction' => [
                    'parts' => [['text' => config('bot.system_prompt')]],
                ],
                'contents' => [
                    ['parts' => [['text' => $question]]],
                ],
            ]
        );

        if ($response->failed()) {
            throw new \RuntimeException('Gemini API error: ' . $response->status());
        }

        return $response->json('candidates.0.content.parts.0.text')
            ?? throw new \RuntimeException('Gemini returned unexpected response format');
    }
}
