import { PublicKey, Connection } from "@solana/web3.js"
const conn = new Connection("https://api.devnet.solana.com")
for (const addr of ["En7GHo1MqYr3uitVangryintsZxRDa4RMBqZYzNHPDAj", "BQ9gPijCi4tgeEtw8dUHyBmtk7Bn6FX23j1X5VNDNRYs"]) {
  const info = await conn.getAccountInfo(new PublicKey(addr))
  if (!info) { console.log(`${addr}: NOT FOUND (likely cleaned up)`); continue }
  const d = info.data
  console.log(`\n${addr}:`)
  console.log(`  size=${d.length}, owner=${info.owner.toBase58()}`)
}
