<?php

namespace App\Modules\Chat\Controllers;

use Illuminate\Http\Request;
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

    public function store(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        try {
            $message = $this->messageService->store($user->id, (string) $request->input('content', ''));
        } catch (\InvalidArgumentException $e) {
            $code = $e->getMessage();
            $status = match ($code) {
                'rate_limit_exceeded' => 429,
                default               => 422,
            };

            return response()->json(['error' => $code], $status);
        }

        return response()->json(['data' => $message], 201);
    }
}
