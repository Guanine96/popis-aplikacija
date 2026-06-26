import type { AppUser, UserRole } from "@/lib/types"

type ProfileRow = {
  id: string
  user_id: string | null
  company_id: string | null
  full_name: string
  username: string | null
  role: string
  is_online: boolean | null
  items_counted: number | null
  financial_value: number | null
  created_at: string
}

function mapRole(dbRole: string): UserRole {
  return dbRole === "admin" ? "admin" : "popisivac"
}

export function profileToAppUser(row: ProfileRow): AppUser {
  return {
    id: row.id,
    username: row.username ?? row.full_name.toLowerCase().replace(/\s+/g, "."),
    displayName: row.full_name,
    role: mapRole(row.role),
    orgId: row.company_id ?? "",
    isOnline: Boolean(row.is_online),
    itemsCounted: Number(row.items_counted ?? 0),
    financialValue: Number(row.financial_value ?? 0),
    createdAt: row.created_at,
  }
}
