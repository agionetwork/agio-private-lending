import type { ReactNode } from "react"
import "./pitch-deck.css"

export default function PitchDeckLayout({ children }: { children: ReactNode }) {
  return <div className="pitch-deck-route">{children}</div>
}
