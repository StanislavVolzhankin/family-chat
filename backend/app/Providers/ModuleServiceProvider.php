<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class ModuleServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadRoutesFrom(base_path('app/Modules/Auth/Routes/auth.php'));
        $this->loadRoutesFrom(base_path('app/Modules/Chat/Routes/chat.php'));
    }
}
