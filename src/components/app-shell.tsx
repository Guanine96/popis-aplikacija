"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"

import { AppLogo } from "@/components/AppLogo"
import { useAuth } from "@/context/AuthContext"
import { ADMIN_NAV } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const BARE_ROUTES = ["/auth/login", "/popis"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  if (BARE_ROUTES.some((r) => pathname.startsWith(r))) {
    return <>{children}</>
  }

  if (!user) {
    return <>{children}</>
  }

  const navItems = ADMIN_NAV

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="flex min-h-dvh w-full bg-zinc-950">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-cyan-500/10 bg-zinc-950 md:flex">
        <div className="px-5 py-5">
          <AppLogo size="md" showWordmark />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.06)]"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200",
                )}
              >
                <item.icon className="size-4.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-cyan-500/10 px-4 py-4">
          <p className="truncate text-xs text-zinc-500">{user.displayName}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="mt-2 w-full justify-start text-zinc-500 hover:text-red-400"
          >
            <LogOut data-icon="inline-start" className="size-4" />
            Odjava
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-cyan-500/10 bg-zinc-950/90 px-4 py-3 backdrop-blur md:hidden">
          <AppLogo size="sm" showWordmark subtitle="Inventar" />
          <Button variant="ghost" size="icon" onClick={logout} className="text-zinc-500">
            <LogOut className="size-4" />
          </Button>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-cyan-500/10 bg-zinc-950/95 backdrop-blur md:hidden">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-cyan-400" : "text-zinc-600",
              )}
            >
              <item.icon
                className={cn(
                  "size-5",
                  active && "drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]",
                )}
              />
              {item.short}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
