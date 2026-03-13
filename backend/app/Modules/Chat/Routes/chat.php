<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Chat\Controllers\MessageController;

Route::prefix('api')->middleware('auth.jwt')->group(function () {
    Route::get('/messages', [MessageController::class, 'index']);
});
