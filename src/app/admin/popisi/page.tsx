import { PopisManagement } from "@/components/admin/PopisManagement"
import { AuthGate, RoleGate } from "@/components/AuthGate"

export default function PopisiPage() {
  return (
    <AuthGate>
      <RoleGate role="admin">
        <PopisManagement />
      </RoleGate>
    </AuthGate>
  )
}
