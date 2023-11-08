import type { InputChain } from "@polkadot-api/light-client-extension-helpers/background"

export type ToContent = {
  origin: "my-extension-background"
  type: "onAddChainByUser"
  inputChain: InputChain
}
