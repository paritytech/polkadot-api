import { fromHex, toHex } from "@polkadot-api/utils"
import { getMetadata } from "./getMetadata"
import { writeFile } from "node:fs/promises"
import {
  Hex,
  StringRecord,
  Struct,
  bool,
  metadata,
  str,
  u8,
} from "@polkadot-api/substrate-bindings"
import rawMeta from "./polkadot-metadata"
import { getDynamicBuilder, getLookupFn } from "@polkadot-api/substrate-codegen"

const genericCallDecoder = Struct({
  module: u8,
  method: u8,
  args: Hex(Infinity),
}).dec

const getV14 = (rawMeta: string) => {
  const decodedMeta = metadata.dec(rawMeta)
  if (decodedMeta.metadata.tag !== "v14") throw null
  return decodedMeta.metadata.value
}

const stringRecordMap = <Input, Output>(
  input: StringRecord<Input>,
  mapper: (value: Input, key: string, obj: StringRecord<Input>) => Output,
): StringRecord<Output> =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      mapper(value, key, input),
    ]),
  ) as StringRecord<Output>

function examineCall(
  from: Uint8Array,
  callData: Uint8Array,
  v14Metadata: Uint8Array,
) {
  const { module: moduleIdx, method, args } = genericCallDecoder(callData)

  const v14 = getV14(rawMeta)
  const getType = getLookupFn(v14.lookup)

  const dynamicBuilder = getDynamicBuilder(v14)

  const module = v14.pallets.find((p) => p.index === moduleIdx)!
  const moduleName = module.name

  const callsLookup = getType(module.calls as number)

  if (callsLookup.type !== "enum") throw null

  const [methodeName, methodData] = Object.entries(callsLookup.value).find(
    ([, methodData]) => {
      return methodData.idx === method
    },
  )!

  if (methodData.type !== "struct" && methodData.type !== "primitive")
    throw null

  const argsCodec =
    methodData.type === "primitive"
      ? Struct({})
      : Struct(
          stringRecordMap(methodData.value, (value) =>
            dynamicBuilder.buildDefinition(value.id),
          ),
        )

  console.log({
    moduleName,
    methodeName,
    arguments: argsCodec.dec(args),
  })

  // console.log({ module, method, callsType })
}

examineCall(
  new Uint8Array(),
  fromHex(
    "0x0500005478706d7da2c69c44b14beb981ee069c59ba83773ae02d8b0e8a714defcc26402093d00",
  ),
  new Uint8Array(),
)

/*
const parsedMeta = await getMetadata()

await writeFile(
  "./src/polkadot-metadata.ts",
  `export default "${toHex(metadata.enc(parsedMeta))}"`,
)

console.log("done")
*/
