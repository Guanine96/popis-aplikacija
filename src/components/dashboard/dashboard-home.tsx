"use client"

import Link from "next/link"
import {
  ArrowRight,
  Boxes,
  ClipboardCheck,
  EyeOff,
  Upload,
  Users,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useInventory } from "@/components/inventory/inventory-provider"

const QUICK_LINKS = [
  {
    href: "/count",
    title: "Nastavi popis",
    description: "Skeniraj i prebroj artikle",
    icon: ClipboardCheck,
  },
  {
    href: "/import",
    title: "Uvezi podatke",
    description: "CSV ili XLSX inventar",
    icon: Upload,
  },
  {
    href: "/users",
    title: "Korisnici",
    description: "Upravljaj nalozima",
    icon: Users,
  },
]

export function DashboardHome() {
  const { session, countedSkus, totalSkus, progress, blind } = useInventory()

  const stats = [
    { label: "Artikala ukupno", value: totalSkus },
    { label: "Prebrojano", value: countedSkus },
    { label: "Preostalo", value: totalSkus - countedSkus },
  ]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/80">
          <Boxes className="size-3.5" />
          Pregled
        </div>
        <h1 className="text-pretty text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Dobrodošli nazad
        </h1>
        <p className="text-sm text-muted-foreground">
          Pregled aktivnog popisa i brze akcije.
        </p>
      </header>

      <Card className="border-border/60 bg-card/60">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">{session.name}</CardTitle>
            <CardDescription>{session.location}</CardDescription>
          </div>
          {blind ? (
            <Badge className="gap-1.5 bg-primary/15 text-primary ring-1 ring-primary/30">
              <EyeOff className="size-3.5" />
              Slijepi popis
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-border bg-secondary font-mono text-xs uppercase tracking-wider text-muted-foreground"
            >
              Standardni
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Napredak popisa</span>
              <span className="font-mono font-semibold text-primary tabular-nums">
                {countedSkus}/{totalSkus}
              </span>
            </div>
            <Progress
              value={progress}
              className="[&_[data-slot=progress-track]]:h-2.5 [&_[data-slot=progress-track]]:bg-secondary"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-1 rounded-lg border border-border/60 bg-secondary/40 p-3"
              >
                <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                  {stat.value}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-5 transition-colors hover:border-primary/40 hover:bg-card"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
              <link.icon className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                {link.title}
                <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </span>
              <span className="text-xs text-muted-foreground">
                {link.description}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
