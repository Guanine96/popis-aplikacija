"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SeatUsageCard } from "./seat-usage-card"
import { UsersTable } from "./users-table"
import { GenerateUserDialog } from "./generate-user-dialog"
import {
  INITIAL_USERS,
  SUBSCRIPTION,
  type SubAccount,
} from "@/lib/users-data"
import { Activity, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AdminDashboard() {
  const [users, setUsers] = useState<SubAccount[]>(INITIAL_USERS)

  const seatsUsed = users.length
  const atLimit = seatsUsed >= SUBSCRIPTION.seatsAllowed
  const activeCount = useMemo(
    () => users.filter((u) => u.active).length,
    [users],
  )

  function handleCreate(newUser: Omit<SubAccount, "id">) {
    const id = `usr_${String(users.length + 1).padStart(2, "0")}`
    setUsers((prev) => [...prev, { ...newUser, id }])
    toast.success("Sub-account provisioned", {
      description: `${newUser.username} now has ${newUser.role} access.`,
    })
  }

  function handleUpgrade() {
    toast("Redirecting to billing", {
      description: "Upgrade your plan to unlock additional seats.",
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/80">
            <ShieldCheck className="size-3.5" />
            Nexus Control
          </div>
          <h1 className="text-pretty text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Provision and monitor sub-accounts across your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {atLimit && (
            <Button
              variant="outline"
              onClick={handleUpgrade}
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <Sparkles data-icon="inline-start" />
              Upgrade Plan
            </Button>
          )}
          <GenerateUserDialog
            atLimit={atLimit}
            seatsAllowed={SUBSCRIPTION.seatsAllowed}
            onCreate={handleCreate}
            onUpgrade={handleUpgrade}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SeatUsageCard
            subscription={SUBSCRIPTION}
            activeAccounts={seatsUsed}
          />
        </div>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              <Activity className="size-4 text-primary" />
              Live Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Active now
              </span>
              <span className="font-mono text-lg font-semibold text-primary tabular-nums">
                {activeCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Inactive</span>
              <span className="font-mono text-lg font-semibold text-foreground/70 tabular-nums">
                {seatsUsed - activeCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Seats free</span>
              <span className="font-mono text-lg font-semibold text-foreground/70 tabular-nums">
                {Math.max(0, SUBSCRIPTION.seatsAllowed - seatsUsed)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">Sub-Accounts</CardTitle>
            <CardDescription>
              {seatsUsed} of {SUBSCRIPTION.seatsAllowed} seats allocated
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="border-border bg-secondary font-mono text-xs uppercase tracking-wider text-muted-foreground"
          >
            {users.length} total
          </Badge>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} />
        </CardContent>
      </Card>
    </div>
  )
}
