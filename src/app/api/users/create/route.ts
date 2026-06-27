import { NextResponse } from "next/server"

import { usernameToEmail } from "@/lib/auth-email"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Neautorizovano" }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role, company_id")
      .eq("user_id", user.id)
      .single()

    if (!adminProfile || adminProfile.role !== "admin") {
      return NextResponse.json({ error: "Samo admin" }, { status: 403 })
    }

    const body = await request.json()
    const { username, password, displayName, orgId } = body as {
      username: string
      password: string
      displayName: string
      orgId: string
    }

    if (!username || !password || !displayName || orgId !== adminProfile.company_id) {
      return NextResponse.json({ error: "Neispravan zahtev" }, { status: 400 })
    }

    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("company_id", orgId)

    const { data: company } = await supabase
      .from("companies")
      .select("seats_total, max_licenses, subscription_active")
      .eq("id", orgId)
      .single()

    if (company?.subscription_active === false) {
      return NextResponse.json({ error: "Pretplata nije aktivna" }, { status: 403 })
    }

    const licenseLimit = company?.max_licenses ?? company?.seats_total ?? 0

    if (company && count !== null && count >= licenseLimit) {
      return NextResponse.json(
        { error: "Limit licenci dostignut — nadogradite paket" },
        { status: 409 },
      )
    }

    const admin = createAdminClient()
    const email = usernameToEmail(username)

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Kreiranje korisnika nije uspelo" },
        { status: 400 },
      )
    }

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: created.user.id,
      company_id: orgId,
      full_name: displayName,
      username: username.toLowerCase(),
      role: "worker",
    })

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, userId: created.user.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Greška servera"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
