#!/usr/bin/env node

import "./_polyfills"

import {
  CodecType,
  metadata as $metadata,
} from "@polkadot-api/substrate-bindings"
import { confirm, input, select } from "@inquirer/prompts"
import { z } from "zod"
import { program } from "commander"
import { getMetadata } from "./metadata"
import { WellKnownChain } from "@substrate/connect"
import ora from "ora"
import {
  outputCodegen,
  outputDescriptors,
  readDescriptors,
  writeMetadataToDisk,
} from "./io"
import { runWithEscapeKeyHandler } from "./keyboard"

const ProgramArgs = z.object({
  metadataFile: z.string().optional(),
  pkgJSONKey: z.string(),
  key: z.string().optional(),
  file: z.string().optional(),
  wsURL: z.string().optional(),
  chainSpec: z.string().optional(),
  interactive: z.boolean(),
})

type ProgramArgs = z.infer<typeof ProgramArgs>

program
  .name("polkadot-api")
  .description("Polkadot API CLI")
  .option(
    "-j, --pkgJSONKey <key>",
    "key in package json for descriptor metadata",
    "polkadot-api",
  )
  .option("k --key <key>", "first key in descriptor metadata")
  .option(
    "f --file <file>",
    "path to descriptor metadata file; alternative to package json",
  )
  .option("w --wsURL <wsURL>", "websocket url to fetch metadata")
  .option("c --chainSpec <chainSpec>", "chainspec to fetch metadata")
  .option("-i, --interactive", "whether to run in interactive mode", false)

program.parse()

const options = ProgramArgs.parse(program.opts())

const descriptorMetadata = await readDescriptors({
  pkgJSONKey: options.pkgJSONKey,
  fileName: options.file,
})

let metadata: {
  magicNumber: number
  metadata: CodecType<typeof $metadata>["metadata"] & { tag: "v14" }
} | null = null

if (descriptorMetadata) {
  for (const [key, descriptorData] of Object.entries(descriptorMetadata)) {
    metadata = await getMetadata({
      source: "file",
      file: descriptorData.metadata,
    })

    if (!options.interactive) {
      await outputCodegen(
        metadata!.metadata.value,
        descriptorData.outputFolder,
        key,
      )
      process.exit(0)
    }
  }
}

if (!metadata) {
  const metadataArgs = options.metadataFile
    ? {
        source: "file" as const,
        file: options.metadataFile,
      }
    : options.wsURL
    ? { source: "ws" as const, url: options.wsURL }
    : options.chainSpec
    ? { source: "chainSpec" as const, chainSpec: options.chainSpec }
    : {
        source: "chain" as const,
        chain: await select({
          message: "Select a chain to pull metadata from",
          choices: [
            { name: "polkadot", value: WellKnownChain.polkadot },
            { name: "westend", value: WellKnownChain.westend2 },
            { name: "ksm", value: WellKnownChain.ksmcc3 },
            { name: "rococo", value: WellKnownChain.rococo_v2_2 },
          ],
        }),
      }

  const spinner = ora(`Loading Metadata`).start()
  metadata = await getMetadata(metadataArgs)
  spinner.stop()
}

await runWithEscapeKeyHandler(async (subscriptions, subscribe) => {
  try {
    const key = await (async () => {
      if (options.key) return options.key

      const getDescriptorKeyPromise = input({
        message: "descriptor key",
        validate: (key) => !!key || "descriptor key cannot be empty",
      })
      subscriptions.push(subscribe(() => getDescriptorKeyPromise.cancel()))

      return await getDescriptorKeyPromise
    })()

    const metadataFilePathPromise = input({
      message: "metadata file path",
      default: descriptorMetadata?.[key]?.metadata ?? `${key}-metadata.scale`,
      validate: (path) => !!path || "metadata filepath cannot be empty",
    })
    subscriptions.push(subscribe(() => metadataFilePathPromise.cancel()))

    const metadataFilePath = await metadataFilePathPromise

    const writeToPkgJSONPromise = confirm({
      message: "Write to package.json?",
      default: options.file === undefined,
    })
    subscriptions.push(subscribe(() => writeToPkgJSONPromise.cancel()))
    const writeToPkgJSON = await writeToPkgJSONPromise

    const outputFolderPromise = input({
      message: "codegen output directory",
      default: descriptorMetadata?.[key]?.outputFolder ?? process.cwd(),
      validate: (dir) => !!dir || "directory cannot be empty",
    })
    subscriptions.push(subscribe(() => outputFolderPromise.cancel()))
    const outputFolder = await outputFolderPromise

    await writeMetadataToDisk(metadata!, metadataFilePath)

    const args = {
      key,
      metadataFile: metadataFilePath,
      outputFolder,
    }

    if (writeToPkgJSON) {
      await outputDescriptors({
        ...args,
        type: "package-json",
        pkgJSONKey: options.pkgJSONKey,
      })
    } else {
      const fileNamePromise = input({
        message: "descriptor json file name",
        default: options.file,
        validate: (value) =>
          (!!value && value !== outputFolder) ||
          "descriptor json file name cannot be equal to codegen output directory",
      })
      subscriptions.push(subscribe(() => fileNamePromise.cancel()))
      const fileName = await fileNamePromise

      await outputDescriptors({
        ...args,
        type: "file",
        fileName,
      })
    }

    await outputCodegen(metadata!.metadata.value, outputFolder, key)
  } catch (err) {
    if (err instanceof Error && err.message === "Prompt was canceled") {
      return
    }
    throw err
  }
})
