import { LiveDashboard } from "@/components/dashboard/LiveDashboard"
import { AuthGate, RoleGate } from "@/components/AuthGate"

export default function DashboardPage() {
  return (
    <AuthGate>
      <RoleGate role="admin">
        <LiveDashboard />
      </RoleGate>
    </AuthGate>
  )
}
