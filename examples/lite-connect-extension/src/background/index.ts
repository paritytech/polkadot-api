import {
  backgroundHelper,
  lightClientPageHelper,
} from "@polkadot-api/light-client-extension-helpers/background"
import type { ToContent } from "../content/protocol"

backgroundHelper(async (inputChain, tabId) => {
  if (
    !(await chrome.tabs.sendMessage(tabId, {
      origin: "my-extension-background",
      type: "onAddChainByUser",
      inputChain,
    } as ToContent))
  )
    throw new Error("addChainByUser rejected")

  await lightClientPageHelper.persistChain(
    inputChain.chainSpec,
    inputChain.relayChainGenesisHash,
  )
})
