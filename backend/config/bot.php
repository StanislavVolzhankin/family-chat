<?php

return [
    'name'               => env('BOT_NAME', 'Lulu'),
    'openai_key'         => env('OPENAI_API_KEY'),
    'openai_model'       => env('OPENAI_MODEL', 'gpt-4o-mini'),
    'unavailable_message' => env('BOT_UNAVAILABLE_MESSAGE', 'Lulu временно недоступна. Попробуйте позже.'),
    'system_prompt'      => 'Ты дружелюбный помощник по имени Lulu. Отвечай кратко и по делу, заканчивай мысль полностью.',
];
