<?php

namespace App\Modules\PrivateChat\Models;

use App\Modules\Auth\Models\User;
use Illuminate\Database\Eloquent\Model;

class PrivateChatMember extends Model
{
    protected $table = 'private_chat_members';
    public $timestamps = false;

    protected $fillable = ['chat_id', 'user_id', 'joined_at'];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
