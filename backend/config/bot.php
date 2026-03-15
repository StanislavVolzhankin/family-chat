<?php

return [
    'name'               => env('BOT_NAME', 'Lulu'),
    'llm_provider'       => env('LLM_PROVIDER', 'gemini'),
    'gemini_key'         => env('GEMINI_API_KEY'),
    'gemini_model'       => env('GEMINI_MODEL', 'gemini-2.5-flash'),
    'openai_key'         => env('OPENAI_API_KEY'),
    'openai_model'       => env('OPENAI_MODEL', 'gpt-4o-mini'),
    'unavailable_message' => env('BOT_UNAVAILABLE_MESSAGE', 'Lulu временно недоступна. Попробуйте позже.'),
    'system_prompt'      => 'Ты дружелюбный помощник по имени Lulu. Отвечай кратко и по делу, заканчивай мысль полностью.',
];
