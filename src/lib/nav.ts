import {
  ClipboardList,
  LayoutDashboard,
  Shield,
  Upload,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  short: string
  adminOnly?: boolean
}

export const ADMIN_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    short: "Pregled",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    href: "/import",
    label: "Uvoz šifrarnika",
    short: "Uvoz",
    icon: Upload,
    adminOnly: true,
  },
  {
    href: "/admin",
    label: "Nalozi",
    short: "Nalozi",
    icon: Shield,
    adminOnly: true,
  },
]

export const COUNTER_NAV: NavItem[] = [
  {
    href: "/popis",
    label: "Popis",
    short: "Popis",
    icon: ClipboardList,
  },
]
