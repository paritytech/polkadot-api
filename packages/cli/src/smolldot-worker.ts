export const PROVIDER_WORKER_CODE = `
const { parentPort, workerData } = require("node:worker_threads")
const { createScClient, WellKnownChain } = require("@substrate/connect")
const { getSyncProvider } = require("@polkadot-api/json-rpc-provider-proxy")

const wellKnownChains = new Set(Object.values(WellKnownChain))

const isWellKnownChain = (input) => wellKnownChains.has(input)

let client
const noop = () => {}
const ScProvider = (input, relayChainSpec) => {
  client ??= createScClient()
  const addChain = (input, jsonRpcCallback) =>
    isWellKnownChain(input)
      ? client.addWellKnownChain(input, jsonRpcCallback)
      : client.addChain(input, jsonRpcCallback)

  return getSyncProvider(async () => {
    let listener = noop
    const onMessage = (msg) => {
      listener(msg)
    }

    let chain
    const relayChain = relayChainSpec
      ? await addChain(relayChainSpec)
      : undefined
    chain = relayChain
      ? await relayChain.addChain(input, onMessage)
      : await addChain(input, onMessage)

    return (onMessage) => {
      listener = onMessage
      return {
        send(msg) {
          chain.sendJsonRpc(msg)
        },
        disconnect() {
          listener = noop
          chain.remove()
        },
      }
    }
  })
}

const { input, relayChainSpec } = workerData
const getProvider = ScProvider(input, relayChainSpec)

if (!parentPort) {
  throw new Error("no parent port")
}

const provider = getProvider((msg) => parentPort.postMessage(msg))

parentPort.on("message", (msg) => {
  switch (msg.type) {
    case "send":
      provider.send(msg.value)
      break
    case "disconnect":
      provider.disconnect()
  }
})
`
