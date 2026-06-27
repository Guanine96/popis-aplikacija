"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Clock,
  FileSpreadsheet,
  Lock,
  Plus,
  Table2,
  Users,
} from "lucide-react"

import { CyberCard } from "@/components/CyberCard"
import { useInventory } from "@/context/InventoryContext"
import { formatDate } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

function statusBadge(status: string) {
  if (status === "ACTIVE") {
    return (
      <Badge className="border-teal-500/40 bg-teal-500/10 text-teal-300">
        Aktivan
      </Badge>
    )
  }
  if (status === "CLOSED") {
    return (
      <Badge className="border-zinc-500/40 bg-zinc-500/10 text-zinc-300">
        Zatvoren
      </Badge>
    )
  }
  return (
    <Badge className="border-rose-500/40 bg-rose-500/10 text-rose-300">
      Istekao
    </Badge>
  )
}

export function PopisManagement() {
  const {
    popisi,
    activePopis,
    isPopisClosed,
    setActivePopis,
    createPopis,
    closeActivePopis,
    popisnaLineCount,
    isLoading,
  } = useInventory()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [teamLabel, setTeamLabel] = useState("")
  const [location, setLocation] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const activePopisi = useMemo(
    () => popisi.filter((p) => p.status === "ACTIVE"),
    [popisi],
  )

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Unesite naziv popisa")
      return
    }
    setSubmitting(true)
    try {
      await createPopis(name.trim(), teamLabel.trim(), location.trim() || undefined)
      toast.success("Popis kreiran", {
        description: "Trajanje: 48 sati. Uvezite popisnu listu za ovaj popis.",
      })
      setName("")
      setTeamLabel("")
      setLocation("")
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kreiranje nije uspelo")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleClose() {
    if (!activePopis) return
    if (!window.confirm(`Zatvoriti popis „${activePopis.name}"? Radnici više ne mogu da unose.`)) {
      return
    }
    try {
      await closeActivePopis()
      toast.success("Popis zatvoren")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Zatvaranje nije uspelo")
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Učitavam popise…
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400/80">
            Upravljanje
          </p>
          <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">Popisi i ekipe</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Više aktivnih popisa istovremeno · auto-brisanje posle 48h
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button className="bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40">
                <Plus data-icon="inline-start" />
                Novi popis
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kreiraj novi popis</DialogTitle>
              <DialogDescription>
                npr. „Popis — Magacin 1 — Ekipa A“. Ističe za 48 sati.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="popis-name">Naziv popisa</Label>
                <Input
                  id="popis-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Popis — Magacin 1 — Ekipa A"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="popis-team">Ekipa (opciono)</Label>
                <Input
                  id="popis-team"
                  value={teamLabel}
                  onChange={(e) => setTeamLabel(e.target.value)}
                  placeholder="Ekipa A"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="popis-loc">Lokacija (opciono)</Label>
                <Input
                  id="popis-loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Magacin 1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={submitting}>
                Kreiraj popis
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {activePopis ? (
        <CyberCard className="p-5" glow={isPopisClosed ? "red" : "teal"}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Izabrani popis
              </p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-50">
                {activePopis.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                {statusBadge(activePopis.status)}
                {activePopis.teamLabel ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" />
                    {activePopis.teamLabel}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  Ističe {formatDate(activePopis.expiresAt)}
                </span>
                <span>{popisnaLineCount} stavki na listi</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-cyan-500/30">
                <Link href="/import/popisna">
                  <FileSpreadsheet data-icon="inline-start" />
                  Uvoz popisne
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-cyan-500/30">
                <Link href="/dashboard/reconciliation">
                  <Table2 data-icon="inline-start" />
                  Tabela razlika
                </Link>
              </Button>
              {!isPopisClosed ? (
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="border-rose-500/30 text-rose-300"
                >
                  <Lock data-icon="inline-start" />
                  Zatvori popis
                </Button>
              ) : null}
            </div>
          </div>
        </CyberCard>
      ) : (
        <CyberCard className="p-6 text-center" glow="cyan">
          <p className="text-zinc-300">Nema aktivnog popisa.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Kreirajte novi popis pre uvoza popisne liste.
          </p>
        </CyberCard>
      )}

      {activePopisi.length > 1 ? (
        <CyberCard className="p-4" glow="cyan">
          <Label className="text-xs uppercase tracking-wider text-zinc-500">
            Prebaci aktivni popis (admin pregled)
          </Label>
          <Select value={activePopis?.id ?? ""} onValueChange={setActivePopis}>
            <SelectTrigger className="mt-2 h-10 w-full max-w-md border-cyan-500/20 bg-zinc-900/60">
              <SelectValue placeholder="Izaberi popis" />
            </SelectTrigger>
            <SelectContent>
              {activePopisi.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.teamLabel ? ` · ${p.teamLabel}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CyberCard>
      ) : null}

      <CyberCard className="overflow-hidden p-0" glow="cyan">
        <Table>
          <TableHeader>
            <TableRow className="border-cyan-500/10 hover:bg-transparent">
              <TableHead>Naziv</TableHead>
              <TableHead>Ekipa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kreiran</TableHead>
              <TableHead>Ističe</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {popisi.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-zinc-500">
                  Još nema popisa.
                </TableCell>
              </TableRow>
            ) : (
              popisi.map((popis) => (
                <TableRow
                  key={popis.id}
                  className={cn(
                    "border-cyan-500/5",
                    activePopis?.id === popis.id && "bg-cyan-500/[0.06]",
                  )}
                >
                  <TableCell className="font-medium text-zinc-100">{popis.name}</TableCell>
                  <TableCell className="text-zinc-400">{popis.teamLabel || "—"}</TableCell>
                  <TableCell>{statusBadge(popis.status)}</TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {formatDate(popis.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {formatDate(popis.expiresAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {popis.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActivePopis(popis.id)}
                        className="text-cyan-400"
                      >
                        Izaberi
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CyberCard>
    </div>
  )
}
