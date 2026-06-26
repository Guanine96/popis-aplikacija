"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Boxes, Loader2 } from "lucide-react"

import { useAuth } from "@/context/AuthContext"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-cyan-400">
          <Boxes className="size-8 animate-pulse" />
          <Loader2 className="size-6 animate-spin" />
          <span className="text-sm text-zinc-500">Učitavanje...</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}

export function RoleGate({
  role,
  children,
}: {
  role: "admin" | "popisivac"
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace("/auth/login")
      return
    }
    if (user.role !== role) {
      router.replace(user.role === "admin" ? "/dashboard" : "/popis")
    }
  }, [user, isLoading, role, router])

  if (isLoading || !user || user.role !== role) return null

  return <>{children}</>
}
