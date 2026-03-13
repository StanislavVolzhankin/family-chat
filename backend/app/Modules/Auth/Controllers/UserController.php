<?php

namespace App\Modules\Auth\Controllers;

use App\Modules\Auth\Requests\CreateUserRequest;
use App\Modules\Auth\Requests\UpdateUserRequest;
use App\Modules\Auth\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class UserController extends Controller
{
    public function __construct(private readonly UserService $userService) {}

    public function store(CreateUserRequest $request): JsonResponse
    {
        try {
            $user = $this->userService->createChild(
                $request->input('username'),
                $request->input('password')
            );

            return response()->json(['data' => $user], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], $this->resolveHttpCode($e->getMessage()));
        }
    }

    public function index(): JsonResponse
    {
        $users = $this->userService->listAll();

        return response()->json(['data' => $users], 200);
    }

    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        $authUser = $request->attributes->get('auth_user');

        try {
            $user = $this->userService->updateUser($id, $request->only(['password', 'is_active']), $authUser->id);

            return response()->json(['data' => $user], 200);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], $this->resolveHttpCode($e->getMessage()));
        }
    }

    private function resolveHttpCode(string $code): int
    {
        return match ($code) {
            'username_taken'          => 422,
            'user_not_found'          => 404,
            'cannot_modify_parent'    => 403,
            'cannot_deactivate_self'  => 422,
            default                   => 500,
        };
    }
}
