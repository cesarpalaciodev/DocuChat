const BASE = "/api"

export interface AuthUser {
  user_id: string
  username: string
  token: string
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("docuchat_user")
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export function setStoredUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem("docuchat_user", JSON.stringify(user))
    else localStorage.removeItem("docuchat_user")
  } catch {}
}

export function getAuthHeaders(): Record<string, string> {
  const user = getStoredUser()
  if (user) return { "Authorization": `Bearer ${user.token}` }
  return {}
}

export async function register(username: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(err.detail || "Registration failed")
  }
  return res.json()
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(err.detail || "Login failed")
  }
  return res.json()
}

export async function getMe(): Promise<AuthUser | null> {
  const user = getStoredUser()
  if (!user) return null
  try {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { "Authorization": `Bearer ${user.token}` },
    })
    if (!res.ok) { setStoredUser(null); return null }
    return res.json()
  } catch { return null }
}
