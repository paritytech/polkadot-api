import { Button, Grid } from "@polkadot-cloud/react"
import { InitStruct, InitStructWithDocs } from "./types"
import { Input } from "../Input"

import "./index.scss"

interface StructureProps {
  pallet: InitStruct
  call: InitStructWithDocs
}

const separatorStyle = {
  border: "0.1rem dashed #999",
  padding: "0.2rem",
  TextAlign: "center",
  marginTop: "1rem",
}

export const Structure = ({ pallet, call }: StructureProps) => (
  <Grid row style={separatorStyle}>
    <Grid column md={12} style={separatorStyle}>
      <Input
        isSimple
        label={"Decoded call"}
        value={pallet.value.name}
        disabled
      />
      <Input isSimple label={"Call"} value={call.value.name} disabled />
      {call.docs.length > 0 ? (
        <>
          <div className="help_tooltip">
            <Button type="help" outline />
            <span className="help_tooltiptext left_tooltip">
              {call.docs?.map((d) => <span>{d}</span>)}
            </span>
          </div>
        </>
      ) : null}
    </Grid>
  </Grid>
)
