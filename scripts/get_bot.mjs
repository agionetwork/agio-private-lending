import { Keypair } from "@solana/web3.js"
import fs from "fs"
const env = fs.readFileSync("/Users/sol/Documents/agio-private-lending/.env.local", "utf-8")
const m = env.match(/FORECLOSURE_BOT_KEYPAIR=(\[.+\])/)
const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(m[1])))
console.log("Bot:", kp.publicKey.toBase58())
