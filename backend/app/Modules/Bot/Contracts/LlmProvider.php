<?php

namespace App\Modules\Bot\Contracts;

interface LlmProvider
{
    /**
     * Send a question to the LLM and return the text response.
     *
     * @throws \RuntimeException when the provider is unavailable
     */
    public function chat(string $question): string;
}
