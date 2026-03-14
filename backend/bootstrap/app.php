<?php

use App\Modules\Chat\Commands\CleanupOldMessages;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withCommands([
        CleanupOldMessages::class,
    ])
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('chat:cleanup-old-messages')->daily();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'auth.jwt'    => \App\Modules\Auth\Middleware\AuthenticateJwt::class,
            'role.parent' => \App\Modules\Auth\Middleware\RequireParentRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
