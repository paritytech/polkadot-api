import type { InputChain } from "@polkadot-api/light-client-extension-helpers/background"

// export type ToBackground = { type: "keep-alive" } | ToExtension
export type ToContent = {
  origin: "lite-extension-background"
  type: "onAddChainByUser"
  inputChain: InputChain
}
