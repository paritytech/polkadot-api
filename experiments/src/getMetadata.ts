import {
  ScProvider,
  WellKnownChain,
  GetProvider,
} from "@polkadot-api/sc-provider"
import { createClient } from "@polkadot-api/substrate-client"
import {
  compact,
  metadata,
  CodecType,
  Tuple,
} from "@polkadot-api/substrate-bindings"

const smProvider = ScProvider(
  WellKnownChain.polkadot /*, {
  embeddedNodeConfig: {
    maxLogLevel: 9,
  },
}*/,
)

const withLogsProvider = (input: GetProvider): GetProvider => {
  return (onMsg, onStatus) => {
    const result = input(
      (msg) => {
        console.log("<< " + msg)
        onMsg(msg)
      },
      (status) => {
        console.log("STATUS CHANGED =>" + status)
        onStatus(status)
      },
    )

    return {
      ...result,
      send: (msg) => {
        console.log(">> " + msg)
        result.send(msg)
      },
    }
  }
}

export const { chainHead } = createClient(withLogsProvider(smProvider))

type Metadata = CodecType<typeof metadata>

const opaqueMeta = Tuple(compact, metadata)

export const getMetadata = (): Promise<Metadata> =>
  new Promise<Metadata>((res, rej) => {
    let requested = false
    const chainHeadFollower = chainHead(
      true,
      (message) => {
        if (message.event === "newBlock") {
          chainHeadFollower.unpin([message.blockHash])
          return
        }
        if (requested || message.event !== "initialized") return
        const latestFinalized = message.finalizedBlockHash
        if (requested) return
        requested = true

        chainHeadFollower
          .call(latestFinalized, "Metadata_metadata", "")
          .then((response) => {
            const [, metadata] = opaqueMeta.dec(response)
            res(metadata)
          })
          .catch((e) => {
            console.log("error", e)
            rej(e)
          })
          .finally(() => {
            chainHeadFollower.unfollow()
          })
      },
      () => {},
    )
  })
