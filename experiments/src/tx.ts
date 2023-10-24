import { UserSignedExtensions, getTxCreator } from "@polkadot-api/tx-helper"
import { ScProvider, WellKnownChain } from "@polkadot-api/sc-provider"
import {
  AccountId,
  Enum,
  SS58String,
  Struct,
  compact,
  u8,
} from "@polkadot-api/substrate-bindings"
import { fromHex, toHex } from "@polkadot-api/utils"
import { ed25519 } from "@noble/curves/ed25519"
import { createClient } from "@polkadot-api/substrate-client"

const client = createClient(ScProvider(WellKnownChain.westend2))
const priv = fromHex(
  "0xb18290bac66576e4067e0c47eb23b2eb40dc2a5906fe9af94063dc163367a1f0",
)
const from = ed25519.getPublicKey(priv)

const { createTx } = getTxCreator(
  ScProvider(WellKnownChain.westend2),
  ({ userSingedExtensionsName }, callback) => {
    const userSignedExtensionsData = Object.fromEntries(
      userSingedExtensionsName.map((x) => {
        if (x === "CheckMortality") {
          const result: UserSignedExtensions["CheckMortality"] = {
            mortal: false,
            // period: 128,
          }
          return [x, result]
        }

        if (x === "ChargeTransactionPayment") return [x, 0n]
        return [x, { tip: 0n }]
      }),
    )

    callback({
      userSignedExtensionsData,
      overrides: {},
      signingType: "Ed25519",
      signer: async (value) => ed25519.sign(value, priv),
    })
  },
)

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

const callData = call.enc({
  module: 4,
  method: 0,
  args: {
    dest: {
      tag: "Id",
      value: "5DyTf5gsCQG3ycM1venTzjoEPMUhKtoU9e9zg1MvnJddbye8" as SS58String,
    },
    value: 1000000n,
  },
})

console.log(toHex(callData))

const transaction = toHex(await createTx(from, callData))

client.transaction(
  transaction,
  (e) => {
    console.log(e)
  },
  (e) => {
    console.error("there was an error ", e)
  },
)
