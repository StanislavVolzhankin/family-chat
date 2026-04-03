<?php

namespace App\Modules\Auth\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    protected $table = 'users';

    protected $fillable = [
        'username',
        'password_hash',
        'role',
        'is_active',
        'is_bot',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_bot'    => 'boolean',
    ];

    /**
     * Laravel's Auth system expects getAuthPassword() to return the hashed password.
     * Our column is named password_hash instead of the default password.
     */
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }
}
