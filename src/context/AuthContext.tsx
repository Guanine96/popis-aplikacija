"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

import { usernameToEmail } from "@/lib/auth-email"
import { createClient } from "@/lib/supabase/client"
import { profileToAppUser } from "@/lib/supabase/mappers"
import type { AppUser, UserRole } from "@/lib/types"

interface AuthContextValue {
  user: AppUser | null
  users: AppUser[]
  orgId: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  createCounter: (
    username: string,
    password: string,
    displayName: string,
  ) => Promise<boolean>
  refreshUsers: () => Promise<void>
  seatsUsed: number
  seatsTotal: number
  maxLicenses: number
  subscriptionActive: boolean
  atSeatLimit: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<AppUser | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [seatsTotal, setSeatsTotal] = useState(5)
  const [maxLicenses, setMaxLicenses] = useState(5)
  const [subscriptionActive, setSubscriptionActive] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  const seatsUsed = users.length
  const licenseLimit = maxLicenses || seatsTotal
  const atSeatLimit = seatsUsed >= licenseLimit

  const loadOrgUsers = useCallback(
    async (companyId: string) => {
      const { data: company } = await supabase
        .from("companies")
        .select("seats_total, max_licenses, subscription_active")
        .eq("id", companyId)
        .single()

      if (company) {
        setSeatsTotal(company.seats_total)
        setMaxLicenses(company.max_licenses ?? company.seats_total)
        setSubscriptionActive(company.subscription_active ?? true)
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at")

      if (profiles) setUsers(profiles.map(profileToAppUser))
    },
    [supabase],
  )

  const refreshUsers = useCallback(async () => {
    if (orgId) await loadOrgUsers(orgId)
  }, [orgId, loadOrgUsers])

  const loadSession = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setUser(null)
      setOrgId(null)
      setUsers([])
      setIsLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authUser.id)
      .single()

    if (!profile?.company_id) {
      setIsLoading(false)
      return
    }

    const appUser = profileToAppUser(profile)
    setUser(appUser)
    setOrgId(profile.company_id)
    await loadOrgUsers(profile.company_id)
    setIsLoading(false)
  }, [supabase, loadOrgUsers])

  useEffect(() => {
    loadSession()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadSession()
    })
    return () => subscription.unsubscribe()
  }, [supabase, loadSession])

  useEffect(() => {
    if (!orgId) return
    const channel = supabase
      .channel("profiles-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `company_id=eq.${orgId}`,
        },
        () => loadOrgUsers(orgId),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, orgId, loadOrgUsers])

  const login = useCallback(
    async (username: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      })
      if (error) return false

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) return false

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .single()

      if (!profile) return false

      const { data: company } = await supabase
        .from("companies")
        .select("subscription_active, max_licenses, seats_total")
        .eq("id", profile.company_id)
        .single()

      if (company && company.subscription_active === false) {
        await supabase.auth.signOut()
        return false
      }

      await supabase
        .from("profiles")
        .update({ is_online: true })
        .eq("id", profile.id)

      const appUser = profileToAppUser({ ...profile, is_online: true })
      setUser(appUser)
      setOrgId(profile.company_id)
      await loadOrgUsers(profile.company_id!)

      router.push(profile.role === "admin" ? "/dashboard" : "/popis")
      return true
    },
    [supabase, router, loadOrgUsers],
  )

  const logout = useCallback(async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ is_online: false })
        .eq("id", user.id)
    }
    await supabase.auth.signOut()
    setUser(null)
    setOrgId(null)
    setUsers([])
    router.push("/auth/login")
  }, [supabase, user, router])

  const createCounter = useCallback(
    async (username: string, password: string, displayName: string) => {
      if (!orgId || atSeatLimit) return false
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName, orgId }),
      })
      if (!res.ok) return false
      await loadOrgUsers(orgId)
      return true
    },
    [orgId, atSeatLimit, loadOrgUsers],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      users,
      orgId,
      isLoading,
      login,
      logout,
      createCounter,
      refreshUsers,
      seatsUsed,
      seatsTotal,
      maxLicenses,
      subscriptionActive,
      atSeatLimit,
    }),
    [
      user,
      users,
      orgId,
      isLoading,
      login,
      logout,
      createCounter,
      refreshUsers,
      seatsUsed,
      seatsTotal,
      maxLicenses,
      subscriptionActive,
      atSeatLimit,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth mora biti unutar AuthProvider-a")
  return ctx
}

export function useRequireRole(role: UserRole | UserRole[]) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const allowed = Array.isArray(role) ? role : [role]

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace("/auth/login")
      return
    }
    if (!allowed.includes(user.role)) {
      router.replace(user.role === "admin" ? "/dashboard" : "/popis")
    }
  }, [user, isLoading, allowed, router])

  return { user, isLoading }
}
