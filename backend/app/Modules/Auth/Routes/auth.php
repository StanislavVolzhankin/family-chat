<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Auth\Controllers\AuthController;

// TODO: add auth middleware (Milestone 1)
Route::prefix('api')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
});
