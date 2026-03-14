<?php

namespace App\Modules\Chat\Commands;

use App\Modules\Chat\Models\Message;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class CleanupOldMessages extends Command
{
    protected $signature = 'chat:cleanup-old-messages';
    protected $description = 'Delete messages older than 30 days';

    public function handle(): int
    {
        $cutoff = Carbon::now()->subDays(30);
        $deleted = 0;

        do {
            $count = Message::where('created_at', '<', $cutoff)
                ->limit(100)
                ->delete();
            $deleted += $count;
        } while ($count === 100);

        $this->info("Deleted {$deleted} old messages.");

        return Command::SUCCESS;
    }
}
