"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { Subscription } from "@/lib/users-data"
import { CreditCard, ShieldCheck, Users, Zap } from "lucide-react"

interface SeatUsageCardProps {
  subscription: Subscription
  activeAccounts: number
}

export function SeatUsageCard({
  subscription,
  activeAccounts,
}: SeatUsageCardProps) {
  const { tier, status, seatsAllowed, renewsOn } = subscription
  const usedPercent = Math.min(
    100,
    Math.round((activeAccounts / seatsAllowed) * 100),
  )
  const atLimit = activeAccounts >= seatsAllowed
  const seatsRemaining = Math.max(0, seatsAllowed - activeAccounts)

  return (
    <Card className="relative overflow-hidden border-border/60">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-70"
      />
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            <CreditCard className="size-4 text-primary" />
            Subscription
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-semibold text-foreground">
              {tier}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "border-primary/40 bg-primary/10 font-mono text-xs uppercase tracking-wider text-primary",
                status === "past_due" &&
                  "border-destructive/40 bg-destructive/10 text-destructive",
              )}
            >
              <ShieldCheck className="size-3" data-icon="inline-start" />
              {status === "active" ? "Active" : status.replace("_", " ")}
            </Badge>
          </div>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Renews
          </p>
          <p className="font-mono text-sm text-foreground/90">
            {new Date(renewsOn).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              <span className="uppercase tracking-wider">Active Accounts</span>
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span
                className={cn(
                  "text-3xl font-semibold tabular-nums",
                  atLimit ? "text-destructive" : "text-primary",
                )}
              >
                {activeAccounts}
              </span>
              <span className="text-lg text-muted-foreground">
                / {seatsAllowed}
              </span>
              <span className="ml-1 text-xs uppercase tracking-wider text-muted-foreground">
                seats
              </span>
            </div>
          </div>

          <Progress
            value={usedPercent}
            className={cn(
              "[&_[data-slot=progress-track]]:h-2.5 [&_[data-slot=progress-track]]:bg-secondary",
              atLimit && "[&_[data-slot=progress-indicator]]:bg-destructive",
            )}
          />

          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">
              {usedPercent}% utilized
            </span>
            <span
              className={cn(
                "flex items-center gap-1 font-mono uppercase tracking-wider",
                atLimit ? "text-destructive" : "text-primary/80",
              )}
            >
              <Zap className="size-3" />
              {atLimit
                ? "Seat limit reached"
                : `${seatsRemaining} seat${seatsRemaining === 1 ? "" : "s"} available`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
