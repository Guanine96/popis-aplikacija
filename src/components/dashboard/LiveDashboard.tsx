"use client"

import { useMemo } from "react"
import {
  Activity,
  BarChart3,
  Package,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { AnimatedCounter } from "@/components/AnimatedCounter"
import { CyberCard } from "@/components/CyberCard"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useInventory } from "@/context/InventoryContext"
import { formatCurrency } from "@/lib/format"

const CHART_COLORS = ["#00f0ff", "#14b8a6", "#22d3ee", "#2dd4bf", "#06b6d4"]

export function LiveDashboard() {
  const {
    session,
    progress,
    totalExpectedItems,
    totalCountedItems,
    totalFinancialValue,
    counterStats,
    blind,
  } = useInventory()

  const pieData = useMemo(
    () => [
      { name: "Popisano", value: totalCountedItems },
      {
        name: "Preostalo",
        value: Math.max(0, totalExpectedItems - totalCountedItems),
      },
    ],
    [totalCountedItems, totalExpectedItems],
  )

  const barData = useMemo(
    () =>
      counterStats.map((s) => ({
        name: s.user.displayName.split(" ")[0],
        vrednost: s.financialValue,
      })),
    [counterStats],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-cyan-400/80">
          <Activity className="size-3.5" />
          Uživo praćenje
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          Dashboard predsednika komisije
        </h1>
        <p className="text-sm text-zinc-400">
          {session.name} · {session.location}
          {blind && (
            <Badge className="ml-2 border-teal-500/40 bg-teal-500/10 text-teal-300">
              Slepi popis aktivan
            </Badge>
          )}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <CyberCard className="p-5" glow="cyan">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-400/70">
            <Package className="size-4" />
            Ukupno artikala
          </div>
          <AnimatedCounter
            value={totalCountedItems}
            className="mt-2 block font-mono text-3xl font-bold text-cyan-300"
          />
          <p className="mt-1 text-xs text-zinc-500">
            od {totalExpectedItems.toLocaleString("sr-RS")} očekivanih
          </p>
        </CyberCard>

        <CyberCard className="p-5" glow="teal">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-teal-400/70">
            <TrendingUp className="size-4" />
            Finansijska vrednost
          </div>
          <AnimatedCounter
            value={totalFinancialValue}
            format={formatCurrency}
            className="mt-2 block font-mono text-3xl font-bold text-teal-300"
          />
          <p className="mt-1 text-xs text-zinc-500">količina × cena</p>
        </CyberCard>

        <CyberCard className="p-5" glow="cyan">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-400/70">
            <Users className="size-4" />
            Aktivni popisivači
          </div>
          <AnimatedCounter
            value={counterStats.filter((s) => s.user.isOnline).length}
            className="mt-2 block font-mono text-3xl font-bold text-cyan-300"
          />
          <p className="mt-1 text-xs text-zinc-500">
            od {counterStats.length} ukupno
          </p>
        </CyberCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CyberCard className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-300">
            <BarChart3 className="size-4 text-cyan-400" />
            Napredak popisa
          </h2>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ResponsiveContainer width="100%" height={200} className="max-w-[200px]">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#00f0ff" : "#27272a"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#09090b",
                    border: "1px solid rgba(0,240,255,0.2)",
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Progres ukupnog popisa</span>
                <span className="font-mono font-semibold text-cyan-300">
                  {progress.toFixed(1)}%
                </span>
              </div>
              <Progress value={progress} className="h-3 bg-zinc-800" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-300">
                  Popisano: {totalCountedItems}
                </div>
                <div className="rounded-lg bg-zinc-800 p-2 text-zinc-400">
                  Preostalo: {Math.max(0, totalExpectedItems - totalCountedItems)}
                </div>
              </div>
            </div>
          </div>
        </CyberCard>

        <CyberCard className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Finansijski unos po popisivaču
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{
                  background: "#09090b",
                  border: "1px solid rgba(0,240,255,0.2)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="vrednost" radius={[6, 6, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CyberCard>
      </div>

      <CyberCard className="overflow-hidden">
        <div className="border-b border-cyan-500/10 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Status popisivača
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-cyan-500/10 hover:bg-transparent">
              <TableHead className="text-zinc-500">Popisivač</TableHead>
              <TableHead className="text-zinc-500">Status</TableHead>
              <TableHead className="text-right text-zinc-500">Artikala</TableHead>
              <TableHead className="text-right text-zinc-500">Vrednost</TableHead>
              <TableHead className="text-zinc-500">Progres</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {counterStats.map((stat, index) => (
              <TableRow
                key={stat.user.id}
                className="border-cyan-500/10 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                style={{ animationDelay: `${index * 80}ms`, animationDuration: "400ms" }}
              >
                <TableCell className="font-medium text-zinc-100">
                  {stat.user.displayName}
                </TableCell>
                <TableCell>
                  {stat.user.isOnline ? (
                    <Badge className="gap-1 border-teal-500/40 bg-teal-500/10 text-teal-300">
                      <Wifi className="size-3" />
                      Online
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-zinc-500">
                      <WifiOff className="size-3" />
                      Offline
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-cyan-300">
                  <AnimatedCounter value={stat.itemsCounted} />
                </TableCell>
                <TableCell className="text-right font-mono text-teal-300">
                  <AnimatedCounter
                    value={stat.financialValue}
                    format={formatCurrency}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={stat.progress} className="h-2 flex-1 bg-zinc-800" />
                    <span className="w-10 text-right font-mono text-xs text-zinc-500">
                      {stat.progress.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CyberCard>
    </div>
  )
}
