const STORAGE_PREFIX = "popis-active-session"

export function getStoredPopisId(orgId: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(`${STORAGE_PREFIX}:${orgId}`)
}

export function setStoredPopisId(orgId: string, popisId: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(`${STORAGE_PREFIX}:${orgId}`, popisId)
}

export function clearStoredPopisId(orgId: string) {
  if (typeof window === "undefined") return
  localStorage.removeItem(`${STORAGE_PREFIX}:${orgId}`)
}
