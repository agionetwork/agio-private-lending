import type { Metadata } from "next"
import PitchDeckClient from "./pitch-deck-client"

export const metadata: Metadata = {
  title: "Pre-seed Deck",
  description:
    "Agio Network — Pre-seed deck. Connecting AI Agents and Humans through lending on Solana.",
  openGraph: {
    title: "Agio Network · Pre-seed Deck",
    description:
      "Connecting AI Agents and Humans through lending on Solana. P2P credit, programmable terms, MCP-native.",
    type: "website",
  },
}

export default function PitchDeckPage() {
  return <PitchDeckClient />
}
