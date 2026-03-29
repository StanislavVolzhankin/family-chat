<?php

namespace App\Modules\PrivateChat\Models;

use App\Modules\Auth\Models\User;
use Illuminate\Database\Eloquent\Model;

class PrivateMessage extends Model
{
    protected $table = 'private_messages';
    public $timestamps = false;

    protected $fillable = ['chat_id', 'user_id', 'content', 'created_at'];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
