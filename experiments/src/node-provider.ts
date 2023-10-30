import { Keyring, getChain } from "@polkadot-api/node-polkadot-provider"
import { ConnectProvider, WellKnownChain } from "@polkadot-api/sc-provider"
import { Keyring as PolkadotJSKeyring } from "@polkadot/api"
import {
  AccountId,
  Enum,
  SS58String,
  Struct,
  compact,
  u8,
} from "@polkadot-api/substrate-bindings"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import { toHex } from "@polkadot-api/utils"
import { lastValueFrom, tap } from "rxjs"
import { createClient } from "@polkadot-api/substrate-client"
import { getObservableClient } from "@polkadot-api/client"
import { createProvider } from "./smolldot-worker"
import { getNonce } from "./utils"

await cryptoWaitReady()

const createKeyring = (): Keyring => {
  const keyring = new PolkadotJSKeyring({ type: "sr25519" })
  keyring.addFromUri("//Alice", { name: "Alice" })
  keyring.addFromUri("//Bob", { name: "Bob" })

  return {
    getPairs() {
      return keyring.getPairs().map((kp) => ({
        address: kp.address,
        publicKey: kp.publicKey,
        signingType: "Sr25519",
        sign: async (input) => kp.sign(input),
        name: kp.meta.name,
      }))
    },
    onKeyPairsChanged() {
      return () => {}
    },
  }
}

const provider = createProvider(WellKnownChain.westend2)
const client = getObservableClient(createClient(provider))

let invocations = 0

const chain = getChain({
  chainId: "0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e",
  name: "Westend",
  chainProvider: provider,
  keyring: createKeyring(),
  userSignedExtensionDefaults: {
    ChargeTransactionPayment: 1n,
  },
  customizeTx: async (ctx) => {
    const nonce = BigInt(await getNonce(client)(ctx.from))
    console.log("nonce", nonce)
    if (nonce % 2n === 0n) {
      return {
        userSignedExtensionsData: {
          ChargeTransactionPayment: 10n,
        },
      }
    }

    return {} as any
  },
  onCreateTxError: (err) => {
    console.error("create tx error", err)
  },
})

const accounts = await chain.getAccounts()
console.log("accounts", accounts)

const alice = accounts.find((acct) => acct.displayName === "Alice")!
const bob = accounts.find((acct) => acct.displayName === "Bob")!

const { createTx } = chain.connect(console.log)

const call = Struct({
  module: u8,
  method: u8,
  args: Struct({
    dest: Enum({
      Id: AccountId(42),
    }),
    value: compact,
  }),
})

const from = alice.publicKey
const to = bob.address as SS58String

const transaction = toHex(
  await createTx(
    from,
    call.enc({
      module: 4,
      method: 0,
      args: {
        dest: {
          tag: "Id",
          value: to,
        },
        value: 1000000n,
      },
    }),
  ),
)

const tx$ = client.tx$(transaction).pipe(
  tap({
    next: (e) => {
      console.log(e)
      switch (e.type) {
        case "finalized":
          break
        case "invalid":
          process.exit(1)
        default:
          break
      }
    },
    error: (e) => {
      console.error(e)
      process.exit(1)
    },
  }),
)
await lastValueFrom(tx$)

client.chainHead$().unfollow()
client.destroy()
