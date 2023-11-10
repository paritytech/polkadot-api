/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, useState } from "react"
import { Polkicon } from "@polkadot-cloud/react"
import "./index.scss"
import { isValidAddress, snakeToCamel } from "@polkadot-cloud/utils"

interface InputProps {
  label: string
  value: any
  codec?: any
  docs?: any
  len?: number
  style?: object
  smaller?: boolean
  disabled?: boolean
  isSimple?: boolean
  onChange?: (e: any) => void
}

interface CommonProps {
  input?: string
}

type FullProps = InputProps & CommonProps

const ExtraInput = ({ input }: CommonProps) => {
  const [show, setShow] = useState<boolean>(false)
  return (
    input && (
      <div className="xtra-wrapper">
        <div
          className="xtra-input"
          style={{
            display: show ? "block" : "none",
          }}
        >
          {input && <Input value={input} label={"Input"} smaller isSimple />}
        </div>
        <button
          className="show-button"
          style={{}}
          onClick={() => setShow(!show)}
        >
          {show ? "Hide" : "Show"} Extra Info
        </button>
      </div>
    )
  )
}

export const Input: FC<FullProps> = ({
  label,
  codec,
  value,
  style,
  len,
  input,
  disabled,
  onChange,
  smaller,
  isSimple,
}: FullProps & InputProps) => {
  if (isSimple) {
    return (
      <div
        style={style}
        className={`custom-input-wrapper${smaller ? " smaller" : ""}`}
      >
        {label && <div className="label">{snakeToCamel(label)}</div>}
        <input
          disabled={smaller || disabled}
          id={Math.random().toString()}
          value={value}
          placeholder={!value ? "0x.." : undefined}
          onChange={onChange}
        />
      </div>
    )
  }
  let inputValue = value

  const group = { input, disabled }

  switch (codec) {
    // Here are Simple components that needs more than one input
    case "AccountId": {
      const entries = Object.entries(inputValue)
      return (
        <>
          <div className="multiple">
            {entries?.map((entry) => {
              const entry_zero = snakeToCamel(entry[0])
              const entry_one = entry[1] as string
              if (
                isValidAddress(entry_one as string) &&
                entry[0] === "address"
              ) {
                return (
                  <div className="acc-wrapper">
                    <div className="account-id">
                      <Polkicon copy address={entry_one as string} />
                    </div>
                    <Input
                      isSimple
                      label={entry_zero}
                      value={entry_one}
                      {...group}
                    />
                  </div>
                )
              } else {
                return (
                  <Input
                    isSimple
                    label={entry_zero}
                    value={entry_one}
                    {...group}
                  />
                )
              }
            })}
          </div>
          {ExtraInput(group)}
        </>
      )
    }
    case "bitSequence": {
      const entries = Object.entries(inputValue)
      return (
        <>
          <div className="multiple">
            {entries?.map((entry) => (
              <Input
                isSimple
                label={snakeToCamel(entry[0])}
                value={entry[1]}
                {...group}
              />
            ))}
          </div>
          {ExtraInput(group)}
        </>
      )
    }
    case "BytesArray": {
      return (
        <div>
          <div className="multiple">
            <Input
              isSimple
              label={snakeToCamel(label)}
              value={inputValue}
              {...group}
            />
            <Input isSimple label={"Length"} value={len} {...group} />
          </div>
          {ExtraInput(group)}
        </div>
      )
    }
    // Default ones
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
    case "Bytes":
      inputValue = value?.toString()
      break
  }

  return (
    <>
      <Input
        isSimple
        label={snakeToCamel(label)}
        value={inputValue}
        {...group}
      />
      {ExtraInput(group)}
    </>
  )
}
