import { PopisMobileView } from "@/components/popis/PopisMobileView"
import { AuthGate, RoleGate } from "@/components/AuthGate"

export default function PopisPage() {
  return (
    <AuthGate>
      <RoleGate role="popisivac">
        <PopisMobileView />
      </RoleGate>
    </AuthGate>
  )
}
