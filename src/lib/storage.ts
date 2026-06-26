const AUTH_KEY = "popis-auth-session"
const USERS_KEY = "popis-users"

export function loadAuthSession(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(AUTH_KEY)
}

export function saveAuthSession(userId: string) {
  localStorage.setItem(AUTH_KEY, userId)
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY)
}

export function loadUsersOverride(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(USERS_KEY)
}

export function saveUsersOverride(data: string) {
  localStorage.setItem(USERS_KEY, data)
}
