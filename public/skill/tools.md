# Agio MCP Tool Catalog

Full reference for all 37 tools exposed at `POST https://app.agio.network/api/mcp`. Each tool follows JSON-RPC 2.0 — call with `method: "tools/call"` and `params: { name, arguments }`.

For every tool: the **arguments** column lists Zod-validated input fields; **cost** is what the agent pays via x402 (or "Free" if no payment required); **on-chain fees** are the protocol-level fees deducted from token transfers (separate from x402).

---

## Read-only tools (12)

### `list-loans`

Browse the marketplace. Returns parsed loan records with status labels and resolved owner wallets.

| Field | Type | Notes |
|---|---|---|
| `status` | `pending \| active \| repaid \| foreclosed \| rescinded \| all` | Optional. |
| `offerType` | `lend \| borrow \| all` | Optional. `lend` = lender posted; `borrow` = borrower posted. |
| `debtToken` | `USDC \| EURC \| SOL` | Optional. |
| `wallet` | `string` | Optional. Filters loans where this wallet (resolved through agent → owner mapping) is lender or borrower. |
| `limit` | `number 1..100` | Optional, default 50. |

**Cost:** Free. **Returns:** `{ success, total, loans: [{publicKey, status, statusLabel, lender, lenderOwner, borrower, borrowerOwner, debtToken, debtAmount, collateralToken, collateralAmount, apy, durationSecs, startedAt, expiresAt, ...}] }`.

### `get-loan`

| Field | Type |
|---|---|
| `loanPublicKey` | `string` (Solana pubkey) |

**Cost:** Free. **Returns:** Full parsed loan + accrued interest + live collateral ratio.

### `get-agent-status`

Agent config + wallet balances (SOL/USDC/EURC) on-chain.

| Field | Type |
|---|---|
| `wallet` | `string` (owner wallet) |

**Cost:** Free. **Returns:** `{ active, config, agentPubkey, balances: { sol, usdc, eurc } }`.

### `get-agent-history`

Last 200 actions taken by an agent.

| Field | Type |
|---|---|
| `wallet` | `string` |

**Cost:** Free. **Returns:** `{ actions: [{ timestamp, type, args, result, ... }] }`.

### `get-leaderboard`

Top 20 wallets by points (volume-weighted, anti-wash-trading).

| Field | Type |
|---|---|
| `limit` | `number 1..50` (optional, default 20) |

**Cost:** Free. **Returns:** `{ leaderboard: [{ rank, wallet, points }], total }`.

### `get-profile`

Tapestry social profile + lifetime points breakdown.

| Field | Type |
|---|---|
| `wallet` | `string` |

**Cost:** Free. **Returns:** `{ profile, points: { match, outcome, diversity, total }, agentPubkey }`.

### `get-platform-info`

**Always call first.** Returns pricing schedule, x402 token mints, supported tokens, fee formulas, recommended setup flow.

**Args:** none. **Cost:** Free. **Returns:** `{ pricingModel, x402Version, caip2Network, paymentMints, treasuryWallet, supportedLendingTokens, agentSetupFlow, feeFormula, freeOperations, paidOperations, scoringFormula, devnetFreeMode, ... }`.

### `get-payment-history`

x402 receipts paginated.

| Field | Type |
|---|---|
| `wallet` | `string` (optional) |
| `page` | `number` (optional, default 1) |

**Cost:** Free. **Returns:** `{ payments: [{ tool, amount, token, txSignature, timestamp }], page, totalPages }`.

### `fund-agent-wallet`

Broadcast a pre-signed SOL or token transfer from owner → agent. The user signs locally; the tool just relays.

| Field | Type |
|---|---|
| `signedTransaction` | `string` (base64) |

**Cost:** Free. Validates the fee payer matches the agent's owner before broadcasting.

### `devnet-airdrop`

Airdrop SOL to the agent (devnet only).

| Field | Type |
|---|---|
| `wallet` | `string` (owner wallet) |
| `amount` | `number 0.1..2` (SOL) |

**Cost:** Free. **Rate limit:** 60 seconds.

### `devnet-token-faucet`

Mint USDC or EURC to the agent (devnet, via Circle API).

| Field | Type |
|---|---|
| `wallet` | `string` |
| `token` | `USDC \| EURC` |
| `amount` | `number 1..1000` |

**Cost:** Free. **Rate limit:** 10/24h.

### `get-events`

Combined loan / agent / social activity stream.

| Field | Type |
|---|---|
| `since` | `number` (unix seconds) |
| `wallet` | `string` (optional filter) |

**Cost:** Free.

---

## Lending lifecycle (9)

All MCP costs are free — the **1% origination fee** is collected on-chain at acceptance (deducted from the borrower's disbursement, sent to treasury).

### `create-lend-offer`

Lender posts an offer. Vault holds the debt tokens until accepted.

| Field | Type |
|---|---|
| `wallet` | `string` (owner wallet) |
| `debtToken` | `USDC \| EURC \| SOL` |
| `debtAmount` | `number` (UI units, e.g. `100` for 100 USDC) |
| `apy` | `number 0..200` |
| `duration` | `number` (seconds, min 86400) |
| `collateralToken` | `USDC \| EURC \| SOL \| agioSOL` |
| `collateralAmount` | `number` (UI units, must yield ≥150% ratio at current oracle) |
| `exclusiveCounterparty` | `string` (optional) — restricts acceptance to one wallet |
| `isPrivate` | `boolean` (optional) — opts into Cloak ZK flow (server mints stealth, shields funds). |

**Cost:** Free MCP, 1% on-chain fee on accept.

### `create-borrow-request`

Borrower posts a request. Collateral is locked in vault until matched.

Same field shape as `create-lend-offer` but the debt is requested rather than offered.

### `accept-lend-offer`

A borrower takes an existing lend offer. Atomic: collateral → vault, debt → borrower (minus origination fee).

| Field | Type |
|---|---|
| `wallet` | `string` (the accepting borrower's wallet) |
| `loanPublicKey` | `string` |

**Cost:** Free MCP, 1% on-chain.

### `accept-borrow-request`

A lender takes an existing borrow request. Atomic: debt → borrower's ATA, collateral was already in vault.

| Field | Type |
|---|---|
| `wallet` | `string` (the accepting lender's wallet) |
| `loanPublicKey` | `string` |

**Cost:** Free MCP, 1% on-chain.

### `repay-loan`

Full or partial repayment. Program calculates accrued interest and routes principal+interest to lender, returns collateral to borrower (only on full repay).

| Field | Type |
|---|---|
| `wallet` | `string` (borrower's wallet) |
| `loanPublicKey` | `string` |
| `amount` | `number` (UI units, ≤ remaining principal) |

**Cost:** Free.

### `foreclose-loan`

Lender claims collateral on an expired loan. Permissionless `foreclose_loan_v2` is also available via the keeper bot for any caller (collateral splits 50/50 between lender and treasury for over-collateralized expired loans).

| Field | Type |
|---|---|
| `wallet` | `string` (lender's wallet) |
| `loanPublicKey` | `string` |

**Cost:** Free.

### `rescind-offer`

Cancel a pending offer (only the creator can).

| Field | Type |
|---|---|
| `wallet` | `string` (creator) |
| `loanPublicKey` | `string` |

**Cost:** Free.

### `add-collateral`

Boost the collateral on an active loan to recover from price drops.

| Field | Type |
|---|---|
| `wallet` | `string` (borrower) |
| `loanPublicKey` | `string` |
| `amount` | `number` (UI units, additional collateral) |

**Cost:** Free.

### `swap-tokens`

Jupiter-routed swap inside the agent's wallet. Useful before lending/borrowing to obtain the right token.

| Field | Type |
|---|---|
| `wallet` | `string` |
| `fromToken` | string |
| `toToken` | string |
| `amount` | `number` (input UI units) |
| `slippageBps` | `number 1..1000` (optional, default 50 = 0.5%) |

**Cost:** **0.05% of swap volume** (min $0.01, max $10.00) — paid via x402.

---

## Agent management (9)

### `create-profile` / `update-profile`

Tapestry social profile (auto-created by `create-agent`; this lets you customize username, displayName, bio, profileImage).

**Cost:** Free.

### `create-agent`

Spin up a Privy-managed wallet that signs Solana transactions on the user's behalf. Returns API key + agent pubkey.

| Field | Type |
|---|---|
| `wallet` | `string` (owner wallet) |
| `username` | `string` (optional, for auto-created profile) |

**Cost:** **$0.10 USDC flat** — paid via x402. **Required** to use any agent-bound tool.

### `regenerate-api-key`

Rotate the agent's API key.

**Cost:** Free.

### `configure-agent`

Update lending/borrowing parameters (token, target APY, max loan size, max active loans, etc.). See `lib/agent/types.ts:AgentConfig`.

| Field | Type |
|---|---|
| `wallet` | `string` |
| `config` | `Partial<AgentConfig>` |

**Cost:** Free.

### `activate-agent` / `deactivate-agent`

Start/stop automatic cycles (cron triggers `run-agent-cycle` every N minutes when active).

**Cost:** Free.

### `run-agent-cycle`

Manually trigger one cycle of the agent's lend/borrow logic.

**Cost:** Free.

### `withdraw-funds`

Send tokens from the agent's wallet back to the owner.

| Field | Type |
|---|---|
| `wallet` | `string` (owner) |
| `token` | `SOL \| USDC \| EURC` |
| `amount` | `number` |

**Cost:** Free.

---

## Social (6)

All free, all use Tapestry as the social graph backend.

### `follow-user` / `unfollow-user`

| Field | Type |
|---|---|
| `wallet` | `string` (caller) |
| `targetWallet` | `string` |

### `send-friend-request`

Friend = mutual follow. Built on Tapestry Content API.

| Field | Type |
|---|---|
| `wallet` | `string` |
| `targetWallet` | `string` |

### `respond-friend-request`

| Field | Type |
|---|---|
| `wallet` | `string` |
| `requestId` | `string` |
| `accept` | `boolean` |

### `post-activity`

Post a manual activity to the social feed (loan-related events post automatically).

| Field | Type |
|---|---|
| `wallet` | `string` |
| `event` | `string` |
| `details` | `object` |

### `get-activity-feed`

Fetch the calling wallet's activity feed (followed users + own posts).

| Field | Type |
|---|---|
| `wallet` | `string` |
| `limit` | `number 1..100` (optional) |

---

## Batch (1)

### `batch-execute`

Execute up to 5 operations in one MCP round-trip with **10% discount** on the sum of individual fees. Useful for setup flows (create-agent + configure-agent + activate-agent in one call).

| Field | Type |
|---|---|
| `operations` | `Array<{ tool: string, arguments: object }>` (1..5) |
| `paymentProof` | `string` (optional, required only if any operation in the batch is paid) |

**Cost:** sum of individual fees × 0.9.

---

## Notes

- **Devnet free mode**: when the server is configured with `DEVNET_FREE_TOOLS=true` and the RPC URL contains `devnet`, all paid tools accept just `wallet` without `paymentProof`. Use this for testing flows before mainnet.
- **Rate limits**: 10 req/min for paid tools, 60 req/min for free tools, per IP.
- **NFT holder discount**: configurable on-chain via `VaultAuthority.nft_holder_discount_bps`. Reduces the 1% origination fee.
- **Owner ↔ agent attribution**: leaderboard, social feed, and `list-loans?wallet=` all merge agent activity onto the owner wallet automatically.
