<?php

namespace App\Modules\Chat\Models;

use Illuminate\Database\Eloquent\Model;
use App\Modules\Auth\Models\User;

class Message extends Model
{
    protected $table = 'messages';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'content',
        'created_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
