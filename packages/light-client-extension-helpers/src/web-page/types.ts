type Callback<T> = (value: T) => void
type UnsubscribeFn = () => void

export interface LightClientProvider {
  // Allows dApp developers to request the provider to register their chain
  addChain: (
    chainSpec: string,
    relayChainGenesisHash?: string,
  ) => Promise<RawChain>

  // Retrieves the current list of available Chains
  getChains: () => Promise<RawChains>

  // Registers a callback invoked when the list of available chains changes
  onChainsChange: (chains: Callback<RawChains>) => UnsubscribeFn
}

// The key is the genesis hash
type RawChains = Record<string, RawChain>

export interface RawChain {
  genesisHash: string

  name: string

  connect: (
    // the listener callback that the JsonRpcProvider will be sending messages to.
    onMessage: Callback<string>,
  ) => Promise<JsonRpcProvider>
}

export interface JsonRpcProvider {
  // it sends messages to the JSON RPC Server
  send: Callback<string>

  // it disconnects from the JSON RPC Server and it de-registers
  // the `onMessage` and `onStatusChange` callbacks that was previously registered
  disconnect: UnsubscribeFn
}