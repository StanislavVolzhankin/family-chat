<?php

namespace App\Modules\PrivateChat\Models;

use Illuminate\Database\Eloquent\Model;

class PrivateChat extends Model
{
    protected $table = 'private_chats';
    public $timestamps = false;

    protected $fillable = ['created_at'];

    public function members()
    {
        return $this->hasMany(PrivateChatMember::class, 'chat_id');
    }

    public function messages()
    {
        return $this->hasMany(PrivateMessage::class, 'chat_id');
    }
}
