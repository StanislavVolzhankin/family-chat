import { getToken } from './auth'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  }
}

export async function login(username, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'server_error')
  }

  return data.data
}

export async function getUsers() {
  const response = await fetch(`${BASE_URL}/api/users`, {
    headers: authHeaders(),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'server_error')
  }

  return data.data
}

export async function createUser(username, password) {
  const response = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ username, password }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'server_error')
  }

  return data.data
}

export async function updateUser(id, updates) {
  const response = await fetch(`${BASE_URL}/api/users/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'server_error')
  }

  return data.data
}

export async function getMessages() {
  const response = await fetch(`${BASE_URL}/api/messages`, {
    headers: authHeaders(),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'server_error')
  }

  return data.data
}

export async function sendMessage(content) {
  const response = await fetch(`${BASE_URL}/api/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'server_error')
  }

  return data.data
}
