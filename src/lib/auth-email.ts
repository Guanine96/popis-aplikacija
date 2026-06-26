export const POPIS_EMAIL_DOMAIN = "popis.rs"

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${POPIS_EMAIL_DOMAIN}`
}

export function emailToUsername(email: string): string {
  return email.split("@")[0] ?? email
}
