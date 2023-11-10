/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"
import { V14, getViewBuilder } from "@polkadot-api/substrate-codegen"

import { Button } from "@polkadot-cloud/react"
import { Input } from "./stories/Input"
import metadata from "./metadata.json"

import "@polkadot-cloud/core/accent/kusama-relay.css"
import "@polkadot-cloud/core/theme/default/index.css"
import "@polkadot-cloud/core/css/styles/index.css"

import "./App.scss"
import { InitStruct, InitStructWithDocs } from "./types"
import { ArgsStructure } from "./stories/ArgStructure"
import { Structure } from "./stories/Structure"

const buttonStyle = {
  background: "#424242",
  padding: "0.5rem 1rem",
  width: "15rem",
}

export const App = () => {
  const [inputValue, setInputValue] = useState<string>("")
  // "",
  // "0x180008040700dc97b0271418c41f80d049826cfb1d6bd2e44e11ea39759addf6b01632ca973d0b00409452a30306050400dc97b0271418c41f80d049826cfb1d6bd2e44e11ea39759addf6b01632ca973d",
  // "0x17002b0f01590100004901415050524f56455f52464328303030352c39636261626661383035393864323933353833306330396331386530613065346564383232376238633866373434663166346134316438353937626236643434290101000000",
  // "0x040700dc97b0271418c41f80d049826cfb1d6bd2e44e11ea39759addf6b01632ca973d0f00c0652095e59d"
  const [err, setErr] = useState<string | null>()

  const [pallet, setPallet] = useState<InitStruct>()
  const [call, setCall] = useState<InitStructWithDocs>()
  const [argsValue, setArgsValue] = useState<any>()

  const decode = (hex: string) => {
    try {
      const { callDecoder } = getViewBuilder(metadata as V14)
      const result = callDecoder(hex)

      const {
        pallet,
        call,
        args: { value },
      } = result
      setPallet(pallet)
      setCall(call)
      setArgsValue(value)
    } catch (e: any) {
      setErr(e.message)
    }
  }

  useEffect(() => {
    if (err) {
      setPallet(undefined)
      setCall(undefined)
      setArgsValue(undefined)
    }
  }, [err])

  return (
    <div className="theme-polkadot-relay theme-light">
      <div className="top-stuff"></div>
      <h3>Decode View</h3>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Input
          isSimple
          label={"hex-encoded call"}
          value={inputValue}
          onChange={(e: any) => setInputValue(e.target.value)}
        />
        <Button
          lg
          style={buttonStyle}
          text="Decode stuff"
          disabled={!inputValue}
          onClick={() => {
            setErr(null)
            decode(inputValue || "")
          }}
        />
      </div>
      <div className="bottom-stuff">
        {err && <div className="error">{err}</div>}
        {pallet && call ? <Structure pallet={pallet} call={call} /> : null}
        {argsValue ? (
          <ArgsStructure
            value={argsValue.value}
            codec={argsValue.codec}
            innerDocs={argsValue.innerDocs}
            input={argsValue.input}
          />
        ) : null}
      </div>
    </div>
  )
}

export default App
