<?php

namespace App\Modules\Chat\Controllers;

use Illuminate\Routing\Controller;

class MessageController extends Controller
{
    // TODO: implement message history (Milestone 3)
    public function index()
    {
        return response()->json(['message' => 'Not implemented yet'], 501);
    }
}
