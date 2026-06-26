import { AdminPanel } from "@/components/admin/AdminPanel"
import { AuthGate, RoleGate } from "@/components/AuthGate"

export default function AdminPage() {
  return (
    <AuthGate>
      <RoleGate role="admin">
        <AdminPanel />
      </RoleGate>
    </AuthGate>
  )
}
