<?php

namespace Database\Seeders;

use App\Modules\Auth\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

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
    }
}
