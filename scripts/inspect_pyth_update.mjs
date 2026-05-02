import { PublicKey, Connection } from "@solana/web3.js"
const conn = new Connection("https://api.devnet.solana.com")
// PriceUpdateV2 layout (Pyth Solana Receiver SDK):
// 8 (discriminator) + 32 (write_authority) + 1 (verification_level enum tag) + (1 num_signatures if Partial) + 32 (price_message.feed_id) + ...
// Actually it's complex. Let me dump a chunk and look for publish_time.
for (const addr of ["C6ezNp4WJf3bUyGk8JxqjM6y4EtMif68ivjTcunFUPWc", "Dov4WFX66NaQxVnCRaDntVkp3mnRKrrhJtoiZndfbqS2"]) {
  const info = await conn.getAccountInfo(new PublicKey(addr))
  if (!info) { console.log(`${addr}: NOT FOUND`); continue }
  const d = info.data
  console.log(`\n${addr}:`)
  console.log(`  size: ${d.length}, owner: ${info.owner.toBase58()}`)
  // Discriminator (PriceUpdateV2): 0x22, 0xf1, 0x23, 0x65, 0x9b, 0xa6, 0x57, 0x42 ?
  console.log(`  disc: ${d.subarray(0, 8).toString('hex')}`)
  console.log(`  write_authority: ${new PublicKey(d.subarray(8, 40)).toBase58()}`)
  // verification_level: enum 0=Partial(num_sigs), 1=Full
  const vl = d[40]
  let off = 41
  if (vl === 0) {
    console.log(`  verification: Partial num_sigs=${d[off]}`)
    off += 1
  } else {
    console.log(`  verification: Full`)
  }
  // price_message: feed_id(32) + price(8 i64) + conf(8 u64) + exponent(4 i32) + publish_time(8 i64) + prev_publish_time(8 i64) + ema_price(8 i64) + ema_conf(8 u64)
  console.log(`  feed_id: ${d.subarray(off, off+32).toString('hex')}`)
  off += 32
  const price = d.readBigInt64LE(off); off += 8
  const conf = d.readBigUInt64LE(off); off += 8
  const expo = d.readInt32LE(off); off += 4
  const pubTime = Number(d.readBigInt64LE(off)); off += 8
  const now = Math.floor(Date.now() / 1000)
  console.log(`  price=${price} conf=${conf} expo=${expo}`)
  console.log(`  publish_time=${pubTime} (age=${now - pubTime}s)`)
}
