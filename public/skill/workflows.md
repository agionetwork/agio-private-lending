# Agio MCP Workflows

Three end-to-end recipes. Pseudocode is JSON-RPC over the `https://app.agio.network/api/mcp` endpoint. Each step shows the `tools/call` payload (`params.name` + `params.arguments`).

---

## Workflow 1 — Browse and accept a USDC lend offer

User goal: "find a USDC loan offer paying ≥10% APY for ≤30 days, and take it as the borrower."

### 1. Discover the platform's current state

```json
{ "name": "get-platform-info", "arguments": {} }
```

Read the response: confirm `supportedLendingTokens` includes USDC, note the `feeFormula` (`fee = max($0.01, min($10, volume * rate))`), and check `devnetFreeMode` so you know whether `paymentProof` is required for `create-agent`/`swap-tokens`.

### 2. List lend offers

```json
{
  "name": "list-loans",
  "arguments": {
    "status": "pending",
    "offerType": "lend",
    "debtToken": "USDC",
    "limit": 50
  }
}
```

Filter the result client-side by `apy >= 10` and `durationSecs <= 30 * 86400`.

### 3. Get full details on the candidate

```json
{ "name": "get-loan", "arguments": { "loanPublicKey": "<candidate>" } }
```

Verify:
- `collateralRatio` is feasible for the borrower (do they have enough SOL/agioSOL?)
- `lender` isn't on a blocklist
- `private_status` is 0 (open marketplace) — if it's 1 or 2, only the named exclusive counterparty can accept

### 4. Make sure the borrower's wallet has the collateral

If the borrower needs SOL or agioSOL, swap first:

```json
{
  "name": "swap-tokens",
  "arguments": {
    "wallet": "<borrower>",
    "fromToken": "USDC",
    "toToken": "SOL",
    "amount": 50
  }
}
```

**Note:** `swap-tokens` is paid (0.05% volume). The first call returns a `PaymentRequirement` — see [x402-payment.md](x402-payment.md) for the proof flow.

### 5. Accept the offer

```json
{
  "name": "accept-lend-offer",
  "arguments": {
    "wallet": "<borrower>",
    "loanPublicKey": "<candidate>"
  }
}
```

Atomic on-chain: collateral → vault, debt → borrower (minus 1% origination fee). Loan status flips to `active`, clock starts.

### Pitfalls

- **PriceFeedStale (6030 / 0x178e):** Pyth `PriceUpdateV2` >300s old. The server posts fresh prices automatically before the accept; if it persists, retry — the protocol re-posts on PriceFeedStale failures. After 2 attempts, escalate.
- **CollateralRatioTooLow:** Live oracle moved against you between `get-loan` (when ratio looked fine) and `accept-lend-offer`. Either add more collateral upfront or wait.
- **`apy` interpretation:** APY is annualized but the program prorates by `duration` — for a 30-day loan at 12% APY on $100, you owe ~$0.99 in interest, not $12.

---

## Workflow 2 — Spin up an autonomous lending agent

User goal: "earn yield automatically — lend out my idle USDC at 8-15% APY against SOL collateral, never lend more than $50 per loan, max 5 active loans."

### 1. Read the setup flow

```json
{ "name": "get-platform-info", "arguments": {} }
```

The response includes a `agentSetupFlow` array — read it; this skill summarizes it but the source of truth is whatever `get-platform-info` returns at call time.

### 2. Create the agent (paid)

```json
{
  "name": "create-agent",
  "arguments": {
    "wallet": "<owner>",
    "username": "yield-hunter-1"
  }
}
```

First call returns a `PaymentRequirement` for $0.10 USDC. Build + sign the payment tx (see [x402-payment.md](x402-payment.md)), then resubmit:

```json
{
  "name": "create-agent",
  "arguments": {
    "wallet": "<owner>",
    "paymentProof": "<base64 signed tx>"
  }
}
```

Response gives you `{ agentPubkey, apiKey }`. Store the API key (it gates subsequent agent-bound tools — though most agent ops are now free in v2 pricing).

### 3. Fund the agent's wallet

The owner signs a transfer to the agent locally and the tool relays it:

```ts
import { Transaction, SystemProgram } from "@solana/web3.js"
import { createTransferInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token"

const tx = new Transaction()
tx.add(
  createTransferInstruction(
    ownerUsdcAta,
    agentUsdcAta,
    owner,
    1000_000000, // 1000 USDC raw
  ),
)
const signed = await wallet.signTransaction(tx)
const proof = signed.serialize().toString("base64")
```

```json
{
  "name": "fund-agent-wallet",
  "arguments": { "signedTransaction": "<base64 signed tx>" }
}
```

Tool validates the fee payer == agent's owner before broadcasting.

### 4. Configure the agent's strategy

```json
{
  "name": "configure-agent",
  "arguments": {
    "wallet": "<owner>",
    "config": {
      "mode": "lend",
      "debtToken": "USDC",
      "minApy": 8,
      "maxApy": 15,
      "maxLoanSizeUsd": 50,
      "maxActiveLoans": 5,
      "minCollateralRatioBps": 15000,
      "preferredCollateralTokens": ["SOL", "agioSOL"],
      "privacyMode": "ask"
    }
  }
}
```

`privacyMode` options: `always` (every loan via Cloak stealth), `ask` (prompt user per loan), `never`.

### 5. Activate

```json
{ "name": "activate-agent", "arguments": { "wallet": "<owner>" } }
```

A cron job on the server triggers `run-agent-cycle` every N minutes (configurable). The agent scans `list-loans` for matches, accepts up to `maxActiveLoans`, and posts events to the social feed.

### 6. Monitor

```json
{ "name": "get-agent-status", "arguments": { "wallet": "<owner>" } }
{ "name": "get-agent-history", "arguments": { "wallet": "<owner>" } }
```

`get-agent-status` returns balances + currently active loans. `get-agent-history` returns the last 200 actions (created offer, accepted, repayment received, etc.).

### Pitfalls

- **API key vs wallet confusion:** the `apiKey` from `create-agent` is needed only by tools that mutate the agent (legacy v1). In v2 most are free — but the wallet param must match the agent's owner.
- **`run-agent-cycle` behavior:** purely additive. It NEVER cancels existing loans. If you want to pause, use `deactivate-agent`.
- **Funding shortfalls:** if the agent's wallet runs out of SOL for tx fees, cycles silently no-op. Always keep ~0.1 SOL in the agent.

---

## Workflow 3 — Full lender lifecycle

User goal: "lend $200 USDC at 12% APY for 30 days, monitor, and either collect repayment or foreclose."

### 1. Post the offer

```json
{
  "name": "create-lend-offer",
  "arguments": {
    "wallet": "<lender>",
    "debtToken": "USDC",
    "debtAmount": 200,
    "apy": 12,
    "duration": 2592000,
    "collateralToken": "SOL",
    "collateralAmount": 1.5
  }
}
```

(Adjust `collateralAmount` to yield ≥150% ratio at current SOL price. Use `get-platform-info` to fetch live prices via the Pyth feed config, or call `list-loans` to see what other lenders are demanding.)

Vault receives 200 USDC. Loan stays `pending` until accepted.

### 2. Wait for acceptance (or rescind)

Poll `list-loans?wallet=<lender>` periodically. When `status` flips from `pending` → `active`, the borrower has accepted. Note the `acceptedAt` timestamp.

If the offer hasn't matched after a while, cancel:

```json
{
  "name": "rescind-offer",
  "arguments": {
    "wallet": "<lender>",
    "loanPublicKey": "<offer>"
  }
}
```

Vault returns the 200 USDC to your wallet.

### 3. Monitor the active loan

```json
{ "name": "get-loan", "arguments": { "loanPublicKey": "<offer>" } }
```

Returns live `collateralRatio`, `accruedInterest`, `expiresAt`. If `collateralRatio` drops below 130% during the term, a separate keeper bot (the `rescind-undercollateralized-offer` flow) automatically liquidates and you receive the collateral instead of the principal.

### 4a. Borrower repays (happy path)

If the borrower calls `repay-loan` before `expiresAt`:
- Loan status → `repaid`
- Your wallet receives principal + accrued interest in USDC
- Borrower's collateral returns to them

You'll see the repayment in `get-payment-history?wallet=<lender>`.

### 4b. Borrower defaults

Once `now > expiresAt + grace_period`:

```json
{
  "name": "foreclose-loan",
  "arguments": {
    "wallet": "<lender>",
    "loanPublicKey": "<offer>"
  }
}
```

The collateral (1.5 SOL) is split:
- If ≥130% of debt + interest at oracle price: lender gets a SOL amount equivalent to debt+interest, treasury and lender split the excess 50/50.
- If <130%: lender gets all collateral, treasury gets nothing.

**The keeper bot** also runs `foreclose_loan_v2` permissionlessly on every expired loan — if you don't act manually, the foreclosure happens automatically within ~5 minutes of expiration. Lenders don't lose anything by waiting.

### Pitfalls

- **Foreclosure before expiration:** program rejects with `LoanNotExpired`. Wait until `start + duration <= clock.unix_timestamp`.
- **Oracle pricing during foreclosure:** uses live Pyth prices, not the price at loan origination. If SOL crashes 50% during the loan, the lender takes the loss.
- **Grace period:** there isn't one in the current program. Foreclosure is allowed at exactly `expiresAt`.
