/**
 * Thin wrapper around `@cloak.dev/sdk`.
 *
 * The SDK is loaded lazily so the rest of the codebase imports from
 * `@/lib/cloak` and never directly from the SDK. The high-level helpers
 * exposed here are tailored to Agio's flow: shield → private transfer →
 * unshield, plus the swap path used during foreclosure liquidation.
 */

import type { Connection, Keypair, PublicKey } from "@solana/web3.js"
import type {
  PrivateTransferOptions,
  ShieldOptions,
  UnshieldOptions,
  ViewingKey,
} from "./types"

let sdkPromise: Promise<typeof import("@cloak.dev/sdk")> | null = null

async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = import("@cloak.dev/sdk").catch((err) => {
      throw new Error(
        `@cloak.dev/sdk failed to load. Make sure it is installed (\`pnpm add @cloak.dev/sdk\`). ` +
          `Original error: ${err?.message ?? err}`,
      )
    })
  }
  return sdkPromise
}

export interface CloakSignerContext {
  /** Public key the SDK should attribute fees to. */
  walletPublicKey: PublicKey
  /** Required for keypair-mode signing (Node, server-side agent flows). */
  depositorKeypair?: Keypair
  /** Wallet adapter for browser flows. Mutually exclusive with `depositorKeypair`. */
  wallet?: any
}

export interface BaseTransactOptions extends CloakSignerContext {
  connection: Connection
  /** Override the default program id (`CLOAK_PROGRAM_ID`). Rare. */
  programId?: PublicKey
  /** Override the default relay URL. Rare. */
  relayUrl?: string
  /** Disable viewing-key registration for one-shot flows that don't audit. */
  enforceViewingKeyRegistration?: boolean
}

// ---------------------------------------------------------------------------
// Shield: take public token balance and create a shielded UTXO the recipient
// can later spend privately.
// ---------------------------------------------------------------------------

export async function shield(
  opts: ShieldOptions,
  signing: BaseTransactOptions,
): Promise<{ utxo: any; signature: string; commitmentIndex: number }> {
  const sdk = await loadSdk()
  const programId = signing.programId ?? sdk.CLOAK_PROGRAM_ID
  const recipient = await resolveUtxoOwner(sdk, opts.recipient)
  const output = await sdk.createUtxo(opts.amount, recipient, opts.mint)
  const result = await sdk.transact(
    {
      inputUtxos: [
        await sdk.createZeroUtxo(opts.mint),
        await sdk.createZeroUtxo(opts.mint),
      ],
      outputUtxos: [output, await sdk.createZeroUtxo(opts.mint)],
      externalAmount: opts.amount,
      depositor: signing.walletPublicKey,
    },
    {
      connection: signing.connection,
      programId,
      relayUrl: signing.relayUrl,
      depositorKeypair: signing.depositorKeypair,
      wallet: signing.wallet,
      walletPublicKey: signing.walletPublicKey,
      enforceViewingKeyRegistration: signing.enforceViewingKeyRegistration ?? false,
    } as any,
  )
  return {
    utxo: result.outputUtxos[0],
    signature: (result as any).signature,
    commitmentIndex: (result as any).commitmentIndices?.[0] ?? -1,
  }
}

// ---------------------------------------------------------------------------
// Private transfer: shield-to-shield. Takes input UTXOs the caller already
// owns and produces an output UTXO owned by `toUtxoPubkey`.
// ---------------------------------------------------------------------------

export async function privateTransfer(
  inputUtxos: any[],
  toUtxoPubkey: bigint,
  amount: bigint,
  signing: BaseTransactOptions,
  _opts?: Pick<PrivateTransferOptions, "memo">,
): Promise<{ outputUtxos: any[]; signature: string }> {
  const sdk = await loadSdk()
  const programId = signing.programId ?? sdk.CLOAK_PROGRAM_ID
  const result = await (sdk as any).transfer(inputUtxos, toUtxoPubkey, amount, {
    connection: signing.connection,
    programId,
    relayUrl: signing.relayUrl,
    depositorKeypair: signing.depositorKeypair,
    wallet: signing.wallet,
    walletPublicKey: signing.walletPublicKey,
    enforceViewingKeyRegistration: signing.enforceViewingKeyRegistration ?? false,
  })
  return { outputUtxos: result.outputUtxos, signature: result.signature }
}

// ---------------------------------------------------------------------------
// Unshield (full or partial): release shielded balance back to a public
// address. Use `partialWithdraw` to keep change shielded.
// ---------------------------------------------------------------------------

export async function unshield(
  opts: UnshieldOptions & { inputUtxos: any[]; partialAmount?: bigint },
  signing: BaseTransactOptions,
): Promise<{ signature: string; changeUtxos?: any[] }> {
  const sdk = await loadSdk()
  const programId = signing.programId ?? sdk.CLOAK_PROGRAM_ID
  if (opts.partialAmount && opts.partialAmount < opts.amount) {
    const result = await sdk.partialWithdraw(
      opts.inputUtxos,
      opts.toAddress,
      opts.partialAmount,
      {
        connection: signing.connection,
        programId,
        relayUrl: signing.relayUrl,
        depositorKeypair: signing.depositorKeypair,
        wallet: signing.wallet,
        walletPublicKey: signing.walletPublicKey,
        enforceViewingKeyRegistration: signing.enforceViewingKeyRegistration ?? false,
      } as any,
    )
    return {
      signature: (result as any).signature,
      changeUtxos: (result as any).outputUtxos,
    }
  }
  const result = await sdk.fullWithdraw(opts.inputUtxos, opts.toAddress, {
    connection: signing.connection,
    programId,
    relayUrl: signing.relayUrl,
    depositorKeypair: signing.depositorKeypair,
    wallet: signing.wallet,
    walletPublicKey: signing.walletPublicKey,
    enforceViewingKeyRegistration: signing.enforceViewingKeyRegistration ?? false,
  } as any)
  return { signature: (result as any).signature }
}

// ---------------------------------------------------------------------------
// Swap (private SOL → SPL): used during foreclosure when collateral has to be
// liquidated without revealing the foreclosure event publicly.
// ---------------------------------------------------------------------------

export interface PrivateSwapOptions {
  inputUtxos: any[]
  swapAmount: bigint
  outputMint: PublicKey
  recipientAta: PublicKey
  minOutputAmount: bigint
}

export async function privateSwap(
  opts: PrivateSwapOptions,
  signing: BaseTransactOptions,
): Promise<{ signature: string; changeUtxos?: any[] }> {
  const sdk = await loadSdk()
  const programId = signing.programId ?? sdk.CLOAK_PROGRAM_ID
  const result = await sdk.swapUtxo(
    {
      inputUtxos: opts.inputUtxos,
      swapAmount: opts.swapAmount,
      outputMint: opts.outputMint,
      recipientAta: opts.recipientAta,
      minOutputAmount: opts.minOutputAmount,
    },
    {
      connection: signing.connection,
      programId,
      relayUrl: signing.relayUrl,
      depositorKeypair: signing.depositorKeypair,
      wallet: signing.wallet,
      walletPublicKey: signing.walletPublicKey,
      enforceViewingKeyRegistration: signing.enforceViewingKeyRegistration ?? false,
    } as any,
  )
  return {
    signature: (result as any).signature,
    changeUtxos: (result as any).outputUtxos,
  }
}

// ---------------------------------------------------------------------------
// Viewing keys
// ---------------------------------------------------------------------------

export async function generateUtxoOwner(): Promise<{ privateKey: bigint; publicKey: bigint }> {
  const sdk = await loadSdk()
  return sdk.generateUtxoKeypair()
}

export async function generateViewingKey(scope: string, expiresAt?: number): Promise<ViewingKey> {
  const sdk = await loadSdk()
  const pair = sdk.generateViewingKeyPair()
  // The SDK returns raw bytes; we hex-encode for storage/transport.
  const hex = sdk.bytesToHex(pair.privateKey)
  return { key: hex, scope, expiresAt }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveUtxoOwner(
  sdk: typeof import("@cloak.dev/sdk"),
  recipient?: string,
): Promise<{ privateKey: bigint; publicKey: bigint }> {
  // No recipient => mint a fresh keypair (caller must persist it to spend later).
  if (!recipient) return sdk.generateUtxoKeypair()
  // We accept either a hex-encoded private key or a JSON-encoded keypair.
  try {
    const parsed = JSON.parse(recipient) as { privateKey: string; publicKey: string }
    return {
      privateKey: BigInt(parsed.privateKey),
      publicKey: BigInt(parsed.publicKey),
    }
  } catch {
    return { privateKey: BigInt(recipient), publicKey: BigInt(0) }
  }
}
