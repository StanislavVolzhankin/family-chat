<?php

namespace App\Providers;

use App\Modules\Bot\Contracts\LlmProvider;
use App\Modules\Bot\Providers\GeminiProvider;
use App\Modules\Bot\Providers\OpenAiProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(LlmProvider::class, function () {
            return match (config('bot.llm_provider')) {
                'openai' => new OpenAiProvider(),
                default  => new GeminiProvider(),
            };
        });
    }

    public function boot(): void
    {
        //
    }
}
