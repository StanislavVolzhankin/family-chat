<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Auth\Controllers\UserController;

Route::prefix('api')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware(['auth.jwt', 'role.parent'])->group(function () {
        Route::post('/users',       [UserController::class, 'store']);
        Route::get('/users',        [UserController::class, 'index']);
        Route::patch('/users/{id}', [UserController::class, 'update']);
    });
});
