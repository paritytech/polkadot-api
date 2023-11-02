import {
  _void,
  bool,
  char,
  str,
  u8,
  u16,
  u32,
  u64,
  u128,
  u256,
  i8,
  i16,
  i32,
  i64,
  i128,
  i256,
  compactNumber,
  compactBn,
  bitSequence,
  Codec,
  Decoder,
  Bytes,
  AccountId,
  Vector,
  HexString,
  createDecoder as _createDecoder,
  Tuple,
  StringRecord,
  Struct,
  Enum,
  toHex as _toHex,
} from "@polkadot-api/substrate-bindings"
import {
  AccountIdDecoded,
  ArrayDecoded,
  ArrayShape,
  BigNumberDecoded,
  BitSequenceDecoded,
  BoolDecoded,
  BytesArrayDecoded,
  BytesSequenceDecoded,
  EnumDecoded,
  EnumShape,
  NumberDecoded,
  PrimitiveDecoded,
  SequenceDecoded,
  SequenceShape,
  StringDecoded,
  StructDecoded,
  StructShape,
  TupleDecoded,
  TupleShape,
  VoidDecoded,
} from "./types"

const toHex = _toHex as (input: Uint8Array) => HexString

type WithoutPath<T extends { path: string[] }> = Omit<T, "path">
type PrimitiveCodec = PrimitiveDecoded["codec"]
export type WithShapeWithoutPath<T extends PrimitiveDecoded> = Decoder<
  WithoutPath<T>
> & {
  shape: { codec: T["codec"] }
}

type PrimitiveShapeDecoder =
  | WithShapeWithoutPath<VoidDecoded>
  | WithShapeWithoutPath<BoolDecoded>
  | WithShapeWithoutPath<StringDecoded>
  | WithShapeWithoutPath<NumberDecoded>
  | WithShapeWithoutPath<StringDecoded>
  | WithShapeWithoutPath<NumberDecoded>
  | WithShapeWithoutPath<BigNumberDecoded>
  | WithShapeWithoutPath<BitSequenceDecoded>
  | WithShapeWithoutPath<AccountIdDecoded>
  | WithShapeWithoutPath<BytesSequenceDecoded>
  | WithShapeWithoutPath<BytesArrayDecoded>

type SequenceShapedDecoder = Decoder<WithoutPath<SequenceDecoded>> & {
  shape: SequenceShape
}
type ArrayShapedDecoder = Decoder<WithoutPath<ArrayDecoded>> & {
  shape: ArrayShape
}
type TupleShapedDecoder = Decoder<WithoutPath<TupleDecoded>> & {
  shape: TupleShape
}
type StructShapedDecoder = Decoder<WithoutPath<StructDecoded>> & {
  shape: StructShape
}
type EnumShapedDecoder = Decoder<WithoutPath<EnumDecoded>> & {
  shape: EnumShape
}
type ComplexShapedDecoder =
  | SequenceShapedDecoder
  | ArrayShapedDecoder
  | TupleShapedDecoder
  | StructShapedDecoder
  | EnumShapedDecoder

export type ShapedDecoder = PrimitiveShapeDecoder | ComplexShapedDecoder

const createDecoder = <T>(
  cb: (bytes: Uint8Array, toHex: () => HexString) => T,
): Decoder<T> => {
  return _createDecoder((_bytes) => {
    const bytes = _bytes as Uint8Array & { i: number; v: DataView }
    const start = bytes.i
    const tHex = () => toHex(new Uint8Array(bytes.buffer.slice(start, bytes.i)))
    return cb(bytes, tHex)
  })
}

const withPrimitiveShape = <S extends PrimitiveCodec>(
  input: Codec<(PrimitiveDecoded & { codec: S })["value"]>,
  codec: S,
): PrimitiveShapeDecoder => {
  const result = createDecoder((bytes, tHex) => ({
    value: input.dec(bytes),
    input: tHex(),
    codec,
  })) as unknown as PrimitiveShapeDecoder
  result.shape = { codec: codec as any }

  return result
}

export const AccountIdShaped = (ss58Prefix = 42) => {
  const { dec } = AccountId(ss58Prefix)
  const codec = "AccountId" as const

  const shapedDecoder: Decoder<WithoutPath<AccountIdDecoded>> = createDecoder(
    (bytes, tHex) => ({
      value: { address: dec(bytes), ss58Prefix },
      input: tHex(),
      codec,
    }),
  )

  const result: WithShapeWithoutPath<AccountIdDecoded> = Object.assign(
    shapedDecoder,
    {
      shape: { codec },
    },
  )

  return result
}

export const BytesArray = (len: number) => {
  const { dec } = Bytes(len)
  const codec = "BytesArray" as const

  const shapedDecoder: Decoder<WithoutPath<BytesArrayDecoded>> = createDecoder(
    (bytes, tHex) => ({
      value: dec(bytes),
      input: tHex(),
      len,
      codec,
    }),
  )

  const result: WithShapeWithoutPath<BytesArrayDecoded> = Object.assign(
    shapedDecoder,
    {
      shape: { codec },
    },
  )

  return result
}

const _primitives = {
  _void,
  bool,
  char,
  str,
  u8,
  u16,
  u32,
  i8,
  i16,
  i32,
  compactNumber,
  u64,
  u128,
  u256,
  i64,
  i128,
  i256,
  compactBn,
  bitSequence,
  Bytes: Bytes(),
  AccountId: AccountIdShaped(),
}

type PrimitiveCodecs = typeof _primitives

export const primitives: {
  [K in keyof PrimitiveCodecs]: Decoder<PrimitiveDecoded & { codec: K }> & {
    shape: { codec: K }
  }
} = Object.fromEntries(
  Object.entries(_primitives).map(([key, value]) => [
    key,
    withPrimitiveShape(value as any, key as any),
  ]),
) as any

const Sequence = (input: ShapedDecoder): SequenceShapedDecoder => {
  const shape: SequenceShape = {
    codec: "Sequence",
    shape: input.shape,
  }
  const vectorDecoder = Vector.dec(input as Decoder<any>)

  const result = createDecoder((bytes, tHex) => ({
    value: vectorDecoder(bytes),
    input: tHex(),
    ...shape,
  })) as SequenceShapedDecoder
  result.shape = shape

  return result
}

const ArrayDec = (input: ShapedDecoder, len: number): ArrayShapedDecoder => {
  const shape: ArrayShape = {
    codec: "Array",
    shape: input.shape,
    len,
  }
  const vectorDecoder = Vector.dec(input as Decoder<any>, len)

  const result = createDecoder((bytes, tHex) => ({
    value: vectorDecoder(bytes),
    input: tHex(),
    ...shape,
  })) as ArrayShapedDecoder
  result.shape = shape

  return result
}

const TupleDec = (...input: Array<ShapedDecoder>): TupleShapedDecoder => {
  const shape: TupleShape = {
    codec: "Tuple",
    shape: input.map((x) => x.shape),
  }
  const decoder = Tuple.dec(...input)

  const result = createDecoder((bytes, tHex) => ({
    value: decoder(bytes),
    input: tHex(),
    ...shape,
  })) as TupleShapedDecoder
  result.shape = shape

  return result
}

const mapStringRecord = <I, O>(
  input: StringRecord<I>,
  mapper: (value: I, key: string) => O,
): StringRecord<O> =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, mapper(value, key)]),
  ) as StringRecord<O>

const StructDec = (input: StringRecord<ShapedDecoder>): StructShapedDecoder => {
  const shape: StructShape = {
    codec: "Struct",
    shape: mapStringRecord(input, (x) => x.shape),
  }
  const decoder = Struct.dec(input)

  const result = createDecoder((bytes, tHex) => ({
    value: decoder(bytes),
    input: tHex(),
    ...shape,
  })) as StructShapedDecoder
  result.shape = shape

  return result
}

const EnumDec = (
  input: StringRecord<ShapedDecoder>,
  args?: number[],
): EnumShapedDecoder => {
  const shape: EnumShape = {
    codec: "Enum",
    shape: mapStringRecord(input, (x) => x.shape),
  }
  const decoder = Enum.dec(input, args as any)

  const result = createDecoder((bytes, tHex) => ({
    value: decoder(bytes),
    input: tHex(),
    ...shape,
  })) as EnumShapedDecoder
  result.shape = shape

  return result
}

export const selfDecoder = (value: () => Decoder<any>): ShapedDecoder => {
  let cache: Decoder<any> = (x) => {
    const decoder = value()
    const result = decoder
    cache = decoder
    return result(x)
  }

  const result = ((x) => cache(x)) as ShapedDecoder
  result.shape = { codec: "_void" }
  return result
}

export const complex = {
  Sequence,
  Array: ArrayDec,
  Tuple: TupleDec,
  Struct: StructDec,
  Enum: EnumDec,
}