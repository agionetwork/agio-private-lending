# x402 Payment Flow (Agio MCP)

Only `create-agent` ($0.10 USDC flat) and `swap-tokens` (0.05% volume) are paid. Everything else is free in MCP. The payment uses the **x402 v2 deferred-settlement** standard: client signs a Solana transfer, server verifies + settles, tool executes.

---

## End-to-end flow

```
Agent ──tools/call (no proof)──▶ Server
   ◀──PaymentRequirement (3 token options)──

Agent ──build + sign Solana tx──▶ Wallet
   ◀──base64-encoded signed tx──

Agent ──tools/call (paymentProof)──▶ Server
                                     │
                                     ├─ verify signature
                                     ├─ extract fee payer (= payerWallet)
                                     ├─ detect transfer to treasury
                                     ├─ convert to USDC equivalent (Jupiter)
                                     ├─ replay-check (SHA-256 hash, Redis 24h TTL)
                                     ├─ execute tool
                                     └─ broadcast & confirm tx
   ◀──tool result + txSignature──
```

---

## Step 1 — Initial call without proof

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create-agent",
    "arguments": { "wallet": "5eYk...vdp" }
  }
}
```

Server responds with a `PaymentRequirement` payload (HTTP 200, content as JSON-RPC `result`):

```json
{
  "x402Version": 2,
  "scheme": "exact",
  "network": "solana",
  "caip2": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "recipient": "<X402_TREASURY_WALLET>",
  "facilitator": "self",
  "tool": "create-agent",
  "amountUsdc": "0.10",
  "acceptedPayments": [
    {
      "token": "USDC",
      "type": "spl",
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "decimals": 6,
      "amountRaw": "100000",
      "amountUi": 0.10,
      "recipientTokenAccount": "<USDC ATA owned by treasury>"
    },
    {
      "token": "EURC",
      "type": "spl",
      "mint": "<EURC mint>",
      "decimals": 6,
      "amountRaw": "92000",
      "amountUi": 0.092,
      "recipientTokenAccount": "<EURC ATA>"
    },
    {
      "token": "SOL",
      "type": "native",
      "mint": "So11111111111111111111111111111111111111112",
      "decimals": 9,
      "amountRaw": "650000",
      "amountUi": 0.00065,
      "recipientTokenAccount": "<treasury wallet>"
    }
  ]
}
```

EURC and SOL amounts are quoted via Jupiter with a small buffer (≈2%). Choose any one of the three.

---

## Step 2 — Build and sign the payment tx

Reference helpers live in [`lib/mcp/x402-client.ts`](https://github.com/agionetwork/agio-private-lending/blob/main/lib/mcp/x402-client.ts) — they're shipped as part of the repo for clients to copy-paste.

```ts
import { Connection, PublicKey } from "@solana/web3.js"
import {
  parsePaymentRequirement,
  buildPaymentTransaction,
} from "@/lib/mcp/x402-client"

const requirement = response.error?.data?.paymentRequirement // however your client surfaces it
const options = parsePaymentRequirement(requirement)
const usdc = options.find((o) => o.token === "USDC")!

const connection = new Connection("https://api.mainnet-beta.solana.com")
const { blockhash } = await connection.getLatestBlockhash("confirmed")

const payer = new PublicKey(myWallet)
const tx = buildPaymentTransaction(payer, usdc, blockhash)

// Sign with whatever wallet adapter you have:
const signed = await wallet.signTransaction(tx)
const paymentProof = signed.serialize().toString("base64")
```

The helper builds the right instruction shape:
- **SPL token (USDC/EURC):** `createAssociatedTokenAccountIdempotentInstruction` (in case the recipient ATA doesn't exist) + `createTransferInstruction` from your ATA to the treasury's ATA.
- **Native SOL:** `SystemProgram.transfer` from your wallet to the treasury wallet.

The fee payer of the transaction MUST be your wallet — the server uses it to attribute the call to you.

---

## Step 3 — Retry with proof

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "create-agent",
    "arguments": {
      "wallet": "5eYk...vdp",
      "paymentProof": "<base64 signed tx>"
    }
  }
}
```

Alternatively the spec supports `_meta["x402/payment"]` — both are accepted.

---

## Server-side verification

`verifyX402Payment` in [`lib/mcp/x402-verify.ts`](https://github.com/agionetwork/agio-private-lending/blob/main/lib/mcp/x402-verify.ts) does:

1. **Decode + deserialize** the base64 transaction.
2. **`tx.verifySignatures()`** — rejects unsigned or partially-signed transactions. Critical: this prevents an attacker from submitting an unsigned tx and trying to settle it.
3. **Extract fee payer** = your wallet pubkey. This is what the tool sees as `payerWallet`.
4. **Detect the transfer**: walks the instructions looking for an SPL Token Transfer to a USDC/EURC ATA whose owner is the treasury, OR a `SystemProgram.transfer` to the treasury wallet.
5. **Convert to USDC equivalent** via Jupiter quote (5min cache). For non-USDC tokens, allows ±3% slippage tolerance.
6. **Replay check**: SHA-256(full tx buffer) — if the hash exists in Redis, reject with `PAYMENT_REPLAY`. Concurrent replays are blocked by a "pending" intermediate state.
7. Returns `{ payerWallet, amountUsdc, paymentToken, verificationHash }`.

---

## Settlement (after tool succeeds)

Server calls `settleX402Payment`:

1. `connection.sendRawTransaction(signed)` — broadcast.
2. `connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")` — wait.
3. Mark settled in Redis with the verificationHash (TTL 24h).
4. Return `{ txSignature, slot, blockTime }` to the client.

If broadcast or confirmation fails, the tool result still goes back but the receipt is marked failed and the user is NOT charged. Server retries are idempotent on the verificationHash.

---

## Devnet shortcut

Set `DEVNET_FREE_TOOLS=true` server-side (the mainnet deployment doesn't have this; the devnet RPC deployment does). Then `paymentProof` becomes optional — pass just `wallet` and the server verifies the wallet has been registered (via `create-agent` or `regenerate-api-key`).

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "create-agent",
    "arguments": { "wallet": "5eYk...vdp" }
  }
}
```

---

## Errors

| Code | Cause |
|---|---|
| `PAYMENT_REQUIRED` | Initial call without proof. The response's `data` field carries the `PaymentRequirement` for you to fulfill. |
| `INVALID_PAYMENT_PROOF` | `tx.verifySignatures()` failed — tx isn't fully signed. |
| `PAYMENT_AMOUNT_MISMATCH` | Transferred amount is below the required USDC equivalent (after 3% slippage tolerance). |
| `PAYMENT_RECIPIENT_MISMATCH` | Transfer destination isn't the treasury wallet (or its USDC/EURC ATA). |
| `PAYMENT_REPLAY` | This tx hash was already used. Build a fresh transaction with a new blockhash. |
| `PAYMENT_BROADCAST_FAILED` | Server tried to broadcast but Solana RPC rejected (stale blockhash, insufficient lamports for fees, etc.). The tool result is still valid; refresh blockhash and retry. |

---

## Reference

- Verifier: [`lib/mcp/x402-verify.ts`](https://github.com/agionetwork/agio-private-lending/blob/main/lib/mcp/x402-verify.ts)
- Client helpers: [`lib/mcp/x402-client.ts`](https://github.com/agionetwork/agio-private-lending/blob/main/lib/mcp/x402-client.ts)
- Pricing config: [`lib/mcp/pricing.ts`](https://github.com/agionetwork/agio-private-lending/blob/main/lib/mcp/pricing.ts)
- Treasury wallet: `process.env.X402_TREASURY_WALLET` (server-side; revealed via `get-platform-info`).
