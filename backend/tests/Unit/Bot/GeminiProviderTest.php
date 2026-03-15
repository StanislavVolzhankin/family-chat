<?php

namespace Tests\Unit\Bot;

use App\Modules\Bot\Providers\GeminiProvider;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeminiProviderTest extends TestCase
{
    public function test_chat_returns_text_from_successful_response(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    ['content' => ['parts' => [['text' => 'Привет!']]]]
                ],
            ], 200),
        ]);

        $provider = new GeminiProvider();
        $result   = $provider->chat('Как дела?');

        $this->assertSame('Привет!', $result);
    }

    public function test_chat_sends_question_and_system_prompt(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    ['content' => ['parts' => [['text' => 'ok']]]]
                ],
            ], 200),
        ]);

        $provider = new GeminiProvider();
        $provider->chat('Вопрос пользователя');

        Http::assertSent(function (Request $request) {
            $body = $request->data();
            return isset($body['contents'][0]['parts'][0]['text'])
                && $body['contents'][0]['parts'][0]['text'] === 'Вопрос пользователя'
                && isset($body['systemInstruction']['parts'][0]['text']);
        });
    }

    public function test_chat_throws_on_http_error(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([], 500),
        ]);

        $this->expectException(\RuntimeException::class);

        $provider = new GeminiProvider();
        $provider->chat('вопрос');
    }

    public function test_chat_throws_on_unexpected_response_format(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response(['unexpected' => 'data'], 200),
        ]);

        $this->expectException(\RuntimeException::class);

        $provider = new GeminiProvider();
        $provider->chat('вопрос');
    }
}
