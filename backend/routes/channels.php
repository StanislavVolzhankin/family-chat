<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('chat', function ($user) {
    return [
        'id'       => $user->id,
        'username' => $user->username,
        'is_bot'   => (bool) $user->is_bot,
    ];
});
