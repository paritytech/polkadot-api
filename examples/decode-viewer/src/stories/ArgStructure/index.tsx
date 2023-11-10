/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ComplexShape,
  PrimitiveDecoded,
  StringRecord,
} from "@polkadot-api/substrate-codegen"
import { KeyValueType } from "./types"
import { snakeToCamel } from "@polkadot-cloud/utils"
import { Input } from "../Input"
import { Button } from "@polkadot-cloud/react"

import "./index.scss"

const separatorStyle = {
  border: "0.1rem dashed #999",
  padding: "0.2rem",
  marginTop: "1rem",
}

interface ArgsProps {
  value: any
  codec: PrimitiveDecoded["codec"] | ComplexShape["codec"]
  innerDocs?: StringRecord<string[]>
  docs?: [string]
  input?: string
  path?: [string]
  tag?: string
}

const capFirstLetter = (str: string): string => {
  const s = snakeToCamel(str)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const PathComponent = (props: { path: [string] }) => (
  <div className="help_tooltip path_class">
    <Button text=">" type="text" outline />
    <span className="help_tooltiptext_right">
      <span>Path:</span>
      {props.path.join(" > ")}
    </span>
  </div>
)

export const ArgsStructure = (args: ArgsProps) => {
  switch (args?.codec) {
    case "Struct": {
      const { innerDocs } = args
      const some = []
      for (const [k, v] of Object.entries(args?.value as KeyValueType)) {
        const { codec, value, input, docs, path } = v as ArgsProps

        switch (codec) {
          case "Sequence": {
            some.push(
              <div style={separatorStyle}>
                <div className="struct_title">{capFirstLetter(k)}</div>
                <ArgsStructure
                  codec={codec}
                  value={value}
                  input={input}
                  path={path}
                />
                {innerDocs &&
                innerDocs[k] &&
                Object.values(innerDocs[k]).length ? (
                  <div className="help_tooltip">
                    <Button type="help" outline />
                    <span className="help_tooltiptext_left">
                      {Object.values(innerDocs[k]).map((d) => (
                        <span>{d}</span>
                      ))}
                    </span>
                  </div>
                ) : null}
              </div>,
            )
            break
          }
          case "u8":
          case "u16":
          case "u32":
          case "i8":
          case "i16":
          case "i32":
          case "compactNumber":
          case "u64":
          case "u128":
          case "u256":
          case "i64":
          case "i128":
          case "i256":
          case "str":
          case "char":
          case "bool":
          case "bitSequence":
          case "Bytes":
          case "compactBn": {
            some.push(
              <div style={separatorStyle}>
                <Input
                  label={k + " : " + codec}
                  value={value}
                  input={input}
                  codec={codec}
                  docs={docs}
                  disabled
                />
              </div>,
            )
            break
          }
          default: {
            some.push(
              <div style={separatorStyle}>
                <div style={{ position: "relative" }}>
                  <Input
                    isSimple
                    label={capFirstLetter(k)}
                    value={value.tag}
                    disabled
                  />
                  {path ? <PathComponent path={path} /> : null}
                </div>
                <ArgsStructure
                  codec={codec}
                  value={value}
                  input={input}
                  docs={docs}
                  path={path}
                />
              </div>,
            )
          }
        }
      }
      return <>{some}</>
    }
    case "Enum": {
      const nextContent = args.value.value
      const { input, docs, path, codec, tag } = args.value
      return (
        <div style={{ marginLeft: "1rem" }}>
          <ArgsStructure
            tag={tag}
            codec={codec}
            value={nextContent}
            input={input}
            docs={docs}
            path={path}
          />
        </div>
      )
    }

    case "Sequence": {
      return (
        <div>
          {args.value.map((a: any) => (
            <div style={{ marginLeft: "1rem" }}>
              <ArgsStructure
                tag={a.tag}
                codec={a.codec}
                value={a.value}
                input={a.input}
                docs={a.docs}
                path={a.path}
              />
            </div>
          ))}
        </div>
      )
    }

    default: {
      if (args.tag) {
        const { input, path, codec, value } = args.value
        switch (codec) {
          case "AccountId":
            return (
              <Input codec={codec} label={codec} value={value} input={input} />
            )
          case "BytesArray":
            return (
              <Input
                codec={codec}
                label={codec}
                len={args.value.len}
                value={value}
                input={input}
              />
            )

          case "u8":
          case "u16":
          case "u32":
          case "i8":
          case "i16":
          case "i32":
          case "compactNumber":
          case "u64":
          case "u128":
          case "u256":
          case "i64":
          case "i128":
          case "i256":
          case "compactBn":
          case "str":
          case "char":
          case "bool":
          case "bitSequence":
          case "Bytes":
            return (
              <Input codec={codec} label={codec} value={value} input={input} />
            )
        }

        const v =
          typeof args.value?.value === "object"
            ? value?.tag || value?.codec
            : value

        return (
          <div style={{ position: "relative" }}>
            <Input
              codec={codec}
              label={capFirstLetter(args?.tag)}
              value={v}
              input={input}
            />
            {path ? <PathComponent path={path} /> : null}
            {typeof value?.value !== "string" ? (
              <ArgsStructure
                tag={value?.value?.tag}
                codec={value?.value?.codec}
                value={value?.value?.value}
                input={value?.value?.input}
                docs={value?.value?.docs}
                path={value?.value?.path}
              />
            ) : null}
          </div>
        )
      }
    }
  }
}
