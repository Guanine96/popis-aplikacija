"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/context/AuthContext"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace("/auth/login")
    } else if (user.role === "admin") {
      router.replace("/dashboard")
    } else {
      router.replace("/popis")
    }
  }, [user, isLoading, router])

  return null
}
