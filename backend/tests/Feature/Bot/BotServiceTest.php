<?php

namespace Tests\Feature\Bot;

use App\Modules\Auth\Models\User;
use App\Modules\Bot\Contracts\LlmProvider;
use App\Modules\Bot\Services\BotService;
use App\Modules\Chat\Events\MessageSent;
use App\Modules\Chat\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BotServiceTest extends TestCase
{
    use RefreshDatabase;

    private function makeBotUser(): User
    {
        return User::create([
            'username'      => config('bot.name'),
            'password_hash' => Hash::make(str()->random(32)),
            'role'          => 'child',
            'is_active'     => true,
            'is_bot'        => true,
        ]);
    }

    private function makeService(string $fixedReply): BotService
    {
        $llm = $this->createMock(LlmProvider::class);
        $llm->method('chat')->willReturn($fixedReply);

        return new BotService($llm);
    }

    private function makeFailingService(): BotService
    {
        $llm = $this->createMock(LlmProvider::class);
        $llm->method('chat')->willThrowException(new \RuntimeException('LLM unavailable'));

        return new BotService($llm);
    }

    // -------------------------------------------------------------------------
    // detect()
    // -------------------------------------------------------------------------

    public function test_detect_returns_true_when_at_bot_name_present(): void
    {
        $service = $this->makeService('ok');
        $this->assertTrue($service->detect('Привет @Lulu, как дела?'));
    }

    public function test_detect_returns_true_when_message_is_only_mention(): void
    {
        $service = $this->makeService('ok');
        $this->assertTrue($service->detect('@Lulu'));
    }

    public function test_detect_returns_false_for_lowercase_mention(): void
    {
        $service = $this->makeService('ok');
        $this->assertFalse($service->detect('@lulu помоги'));
    }

    public function test_detect_returns_false_for_mixed_case_mention(): void
    {
        $service = $this->makeService('ok');
        $this->assertFalse($service->detect('@LuLu привет'));
    }

    public function test_detect_returns_false_when_no_mention(): void
    {
        $service = $this->makeService('ok');
        $this->assertFalse($service->detect('Просто обычное сообщение'));
    }

    // -------------------------------------------------------------------------
    // reply()
    // -------------------------------------------------------------------------

    public function test_reply_saves_message_from_bot_user(): void
    {
        Event::fake();
        $bot     = $this->makeBotUser();
        $service = $this->makeService('Привет!');

        $service->reply('Как дела?', $bot->id);

        $this->assertDatabaseHas('messages', [
            'user_id' => $bot->id,
            'content' => 'Привет!',
        ]);
    }

    public function test_reply_broadcasts_message_sent_event(): void
    {
        Event::fake();
        $bot     = $this->makeBotUser();
        $service = $this->makeService('Всё хорошо');

        $service->reply('Как дела?', $bot->id);

        Event::assertDispatched(MessageSent::class, function (MessageSent $event) use ($bot) {
            return $event->user_id === $bot->id
                && $event->content === 'Всё хорошо'
                && $event->is_bot === true;
        });
    }

    public function test_reply_sends_unavailable_message_when_llm_throws(): void
    {
        Event::fake();
        $bot     = $this->makeBotUser();
        $service = $this->makeFailingService();

        $service->reply('Вопрос', $bot->id);

        $this->assertDatabaseHas('messages', [
            'user_id' => $bot->id,
            'content' => config('bot.unavailable_message'),
        ]);
    }
}
