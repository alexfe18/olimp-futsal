import type { ReactNode } from "react";

import { PlayerAccessGate } from "@/components/auth/PlayerAccessGate";

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return <PlayerAccessGate>{children}</PlayerAccessGate>;
}
