"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  CreditCard,
  Lock,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react"

import { CyberCard } from "@/components/CyberCard"
import { useAuth } from "@/context/AuthContext"
import { useInventory } from "@/context/InventoryContext"
import { formatDate } from "@/lib/format"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function AdminPanel() {
  const {
    users,
    createCounter,
    seatsUsed,
    seatsTotal,
    atSeatLimit,
  } = useAuth()
  const { subscription } = useInventory()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [open, setOpen] = useState(false)

  const counters = users.filter((u) => u.role === "popisivac")
  const seatProgress = (seatsUsed / seatsTotal) * 100

  async function handleCreate() {
    if (!username || !password || !displayName) {
      toast.error("Popunite sva polja")
      return
    }
    const ok = await createCounter(username, password, displayName)
    if (ok) {
      toast.success("Nalog kreiran", {
        description: `${displayName} može da se prijavi sa korisničkim imenom ${username}.`,
      })
      setUsername("")
      setPassword("")
      setDisplayName("")
      setOpen(false)
    } else {
      toast.error("Kreiranje nije uspelo", {
        description: atSeatLimit
          ? "Dostigli ste limit licenci."
          : "Korisničko ime već postoji.",
      })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-cyan-500/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-cyan-400/80">
            <ShieldCheck className="size-3.5" />
            SaaS menadžment
          </div>
          <h1 className="mt-2 text-2xl font-bold text-zinc-50 sm:text-3xl">
            Upravljanje nalozima
          </h1>
          <p className="text-sm text-zinc-400">
            Predsednik komisije — kreiranje i nadzor popisivača
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            disabled={atSeatLimit}
            render={
              <Button
                disabled={atSeatLimit}
                className="bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40 hover:bg-cyan-500/30"
              >
                <UserPlus data-icon="inline-start" />
                Novi popisivač
              </Button>
            }
          />
          <DialogContent className="border-cyan-500/20 bg-zinc-950">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">
                Generiši nalog za popisivača
              </DialogTitle>
              <DialogDescription>
                Kreirajte pristup za člana komisije. Svaki nalog koristi jedno
                mesto iz pretplate.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="displayName">Ime i prezime</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="npr. Petar Nikolić"
                  className="border-zinc-800 bg-zinc-900"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Korisničko ime</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="npr. petar"
                  className="border-zinc-800 bg-zinc-900"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Lozinka</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimalno 6 karaktera"
                  className="border-zinc-800 bg-zinc-900"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Otkaži
              </Button>
              <Button onClick={handleCreate}>Kreiraj nalog</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {atSeatLimit && (
        <Alert className="border-red-500/40 bg-red-500/10">
          <Lock className="size-4 text-red-400" />
          <AlertTitle className="text-red-300">Limit mesta dostignut</AlertTitle>
          <AlertDescription className="text-red-200/80">
            Iskoristili ste svih {seatsTotal} mesta. Kupite dodatne licence da
            biste kreirali nove naloge.
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-cyan-500/40 text-cyan-300"
              onClick={() =>
                toast.info("Kontaktirajte prodaju", {
                  description: "Proširenje licence — prodaja@popis.rs",
                })
              }
            >
              <Sparkles data-icon="inline-start" />
              Kupi još licenci
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <CyberCard className="p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-400/70">
            <CreditCard className="size-4" />
            Status pretplate
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-100">
              {subscription.plan}
            </span>
            <Badge className="border-teal-500/40 bg-teal-500/10 text-teal-300">
              {subscription.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            Obnova: {formatDate(subscription.renewsOn)}
          </p>
        </CyberCard>

        <CyberCard className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-400/70">
              <Users className="size-4" />
              Iskorišćenost mesta
            </div>
            <span className="font-mono text-lg font-bold text-cyan-300">
              {seatsUsed}/{seatsTotal}
            </span>
          </div>
          <Progress value={seatProgress} className="mt-4 h-3 bg-zinc-800" />
          <p className="mt-2 text-xs text-zinc-500">
            {seatsTotal - seatsUsed} slobodnih mesta za nove popisivače
          </p>
        </CyberCard>
      </div>

      <CyberCard className="overflow-hidden">
        <div className="border-b border-cyan-500/10 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Svi nalozi
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-cyan-500/10 hover:bg-transparent">
              <TableHead className="text-zinc-500">Ime</TableHead>
              <TableHead className="text-zinc-500">Korisničko ime</TableHead>
              <TableHead className="text-zinc-500">Uloga</TableHead>
              <TableHead className="text-zinc-500">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="border-cyan-500/10">
                <TableCell className="text-zinc-100">{u.displayName}</TableCell>
                <TableCell className="font-mono text-zinc-400">
                  {u.username}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      u.role === "admin"
                        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400"
                    }
                  >
                    {u.role === "admin" ? "Predsednik" : "Popisivač"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.isOnline ? (
                    <span className="text-teal-400">Online</span>
                  ) : (
                    <span className="text-zinc-600">Offline</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-cyan-500/10 px-5 py-3 text-xs text-zinc-600">
          {counters.length} popisivača · {users.filter((u) => u.role === "admin").length}{" "}
          administrator
        </div>
      </CyberCard>
    </div>
  )
}
