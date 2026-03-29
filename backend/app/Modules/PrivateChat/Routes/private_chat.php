<?php

use App\Modules\PrivateChat\Controllers\PrivateChatController;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->middleware('auth.jwt')->group(function () {
    Route::post('/private-chats', [PrivateChatController::class, 'getOrCreate']);
    Route::get('/private-chats', [PrivateChatController::class, 'index']);
    Route::get('/private-chats/{chatId}/messages', [PrivateChatController::class, 'messages']);
    Route::post('/private-chats/{chatId}/messages', [PrivateChatController::class, 'sendMessage']);
    Route::post('/private-chats/{chatId}/members', [PrivateChatController::class, 'addLulu']);
    Route::delete('/private-chats/{chatId}/members/lulu', [PrivateChatController::class, 'removeLulu']);
});
