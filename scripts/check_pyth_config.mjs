import { PublicKey, Connection } from "@solana/web3.js"
const PROGRAM_ID = new PublicKey("AbvKH8U9B5y8HFNdAbErDo8nsFhFLHRk32HLzPD4GeXX")
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112")
const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")
const USDC_MINT_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
const seed = Buffer.from("price_feed")
const conn = new Connection("https://api.devnet.solana.com")
for (const [sym, mint] of [["SOL", SOL_MINT], ["USDC-devnet", USDC_MINT_DEVNET], ["USDC-mainnet", USDC_MINT_MAINNET]]) {
  const [pda] = PublicKey.findProgramAddressSync([seed, mint.toBuffer()], PROGRAM_ID)
  const info = await conn.getAccountInfo(pda)
  if (!info) { console.log(`${sym}: PDA ${pda.toBase58()} NOT FOUND`); continue }
  const data = info.data
  // Layout: 8 (discriminator) + 32 (mint) + 32 (feed_id) + 1 (decimals) + 1 (bump)
  const onchainMint = new PublicKey(data.subarray(8, 40)).toBase58()
  const feedId = Buffer.from(data.subarray(40, 72)).toString("hex")
  const decimals = data[72]
  console.log(`${sym}:`)
  console.log(`  PDA       ${pda.toBase58()}`)
  console.log(`  onchain mint: ${onchainMint}`)
  console.log(`  feed_id:      ${feedId}`)
  console.log(`  decimals:     ${decimals}`)
}
