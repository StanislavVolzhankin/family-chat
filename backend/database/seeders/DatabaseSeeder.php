<?php

namespace Database\Seeders;

use App\Modules\Auth\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['username' => 'parent'],
            [
                'password_hash' => Hash::make('secret'),
                'role'          => 'parent',
                'is_active'     => true,
            ]
        );

        $botName = config('bot.name', 'Lulu');

        User::firstOrCreate(
            ['username' => $botName],
            [
                'password_hash' => Hash::make(Str::random(32)),
                'role'          => 'child',
                'is_active'     => true,
                'is_bot'        => true,
            ]
        );
    }
}
