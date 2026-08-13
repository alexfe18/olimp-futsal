import type { ReactNode } from "react";

import { PlayerAccessGate } from "@/components/auth/PlayerAccessGate";
import { PlayerAreaNavigation } from "@/components/player/PlayerAreaNavigation";

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return (
    <PlayerAccessGate>
      <PlayerAreaNavigation />
      {children}
    </PlayerAccessGate>
  );
}
