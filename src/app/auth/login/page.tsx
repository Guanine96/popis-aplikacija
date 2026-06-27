"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AppLogo } from "@/components/AppLogo"
import { CyberCard } from "@/components/CyberCard"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const { login, isLoading, user } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && user) {
    router.replace(user.role === "admin" ? "/dashboard" : "/popis")
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const ok = await login(username, password)
    if (!ok) {
      toast.error("Pogrešni podaci", {
        description: "Proverite korisničko ime i lozinku.",
      })
    }
    setSubmitting(false)
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-zinc-950 px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,240,255,0.08)_0%,_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(20,184,166,0.06)_0%,_transparent_40%)]" />

      <CyberCard className="relative z-10 w-full max-w-md p-8" glow="cyan">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <AppLogo size="xl" priority />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Popis Robe
          </h1>
          <p className="text-sm text-zinc-500">
            Prijavite se kao predsednik komisije ili popisivač
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username" className="text-zinc-400">
              Korisničko ime
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin ili marko"
              autoComplete="username"
              className="border-zinc-800 bg-zinc-900 text-zinc-100"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-zinc-400">
              Lozinka
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="border-zinc-800 bg-zinc-900 pr-10 text-zinc-100"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting || isLoading}
            className="mt-2 h-12 bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50 hover:bg-cyan-500/30"
          >
            {submitting || isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              "Prijavi se"
            )}
          </Button>
        </form>

        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-600">
          <p className="font-medium text-zinc-500">Demo nalozi:</p>
          <p className="mt-1">Admin: admin / admin123</p>
          <p>Popisivač: marko / marko123</p>
        </div>
      </CyberCard>
    </div>
  )
}
