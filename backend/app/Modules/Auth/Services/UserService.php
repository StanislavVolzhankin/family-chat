<?php

namespace App\Modules\Auth\Services;

use App\Modules\Auth\Models\User;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function createChild(string $username, string $password): array
    {
        if (User::where('username', $username)->exists()) {
            throw new \InvalidArgumentException('username_taken');
        }

        $user = User::create([
            'username'      => $username,
            'password_hash' => Hash::make($password),
            'role'          => 'child',
            'is_active'     => true,
        ]);

        return $this->formatUser($user);
    }

    public function listAll(): array
    {
        return User::all()->map(fn (User $user) => $this->formatUser($user))->all();
    }

    public function updateUser(int $id, array $data, int $currentUserId): array
    {
        $user = User::find($id);

        if (! $user) {
            throw new \InvalidArgumentException('user_not_found');
        }

        if (isset($data['is_active']) && $data['is_active'] === false && $id === $currentUserId) {
            throw new \InvalidArgumentException('cannot_deactivate_self');
        }

        if ($user->role === 'parent') {
            throw new \InvalidArgumentException('cannot_modify_parent');
        }

        if (isset($data['password'])) {
            $user->password_hash = Hash::make($data['password']);
        }

        if (isset($data['is_active'])) {
            $user->is_active = $data['is_active'];
        }

        $user->save();

        return $this->formatUser($user);
    }

    private function formatUser(User $user): array
    {
        return [
            'id'         => $user->id,
            'username'   => $user->username,
            'role'       => $user->role,
            'is_active'  => $user->is_active,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
