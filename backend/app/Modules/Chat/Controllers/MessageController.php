<?php

namespace App\Modules\Chat\Controllers;

use Illuminate\Routing\Controller;
use App\Modules\Chat\Services\MessageService;

class MessageController extends Controller
{
    public function __construct(private MessageService $messageService) {}

    public function index()
    {
        $data = $this->messageService->getHistory();

        return response()->json(['data' => $data]);
    }
}
