export type UserRole = "Owner" | "Admin" | "Manager" | "Member" | "Viewer"

export type SubscriptionTier = "Starter" | "Pro" | "Enterprise"

export interface SubAccount {
  id: string
  username: string
  email: string
  role: UserRole
  active: boolean
  lastLogin: string | null // ISO string or null if never
}

export interface Subscription {
  tier: SubscriptionTier
  status: "active" | "trialing" | "past_due"
  seatsAllowed: number
  renewsOn: string
}

export const SUBSCRIPTION: Subscription = {
  tier: "Pro",
  status: "active",
  seatsAllowed: 5,
  renewsOn: "2026-07-15",
}

export const INITIAL_USERS: SubAccount[] = [
  {
    id: "usr_01",
    username: "k.morrow",
    email: "k.morrow@nexus.io",
    role: "Owner",
    active: true,
    lastLogin: "2026-06-26T08:12:00Z",
  },
  {
    id: "usr_02",
    username: "d.reyes",
    email: "d.reyes@nexus.io",
    role: "Admin",
    active: true,
    lastLogin: "2026-06-25T17:43:00Z",
  },
  {
    id: "usr_03",
    username: "s.kovac",
    email: "s.kovac@nexus.io",
    role: "Manager",
    active: true,
    lastLogin: "2026-06-24T11:05:00Z",
  },
  {
    id: "usr_04",
    username: "t.bauer",
    email: "t.bauer@nexus.io",
    role: "Member",
    active: false,
    lastLogin: null,
  },
]

export const ROLE_OPTIONS: Exclude<UserRole, "Owner">[] = [
  "Admin",
  "Manager",
  "Member",
  "Viewer",
]

export function formatLastLogin(iso: string | null): string {
  if (!iso) return "Never"
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) return "Just now"
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
