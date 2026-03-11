<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Chat\Controllers\MessageController;

// TODO: add auth middleware (Milestone 1)
Route::prefix('api')->group(function () {
    Route::get('/messages', [MessageController::class, 'index']);
});
