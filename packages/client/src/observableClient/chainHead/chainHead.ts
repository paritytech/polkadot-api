import type {
  ChainHead,
  StorageItemInput,
  StorageItemResponse,
} from "@polkadot-api/substrate-client"
import {
  getWithRecovery,
  getWithUnpinning$,
  getWithOptionalhash$,
  fromAbortControllerFn,
  withLazyFollower,
  withOperationInaccessibleRecovery,
} from "./enhancers"
import { getRuntime$, getFollow$, getFinalized$, getMetadata$ } from "./streams"
import {
  EMPTY,
  Observable,
  asapScheduler,
  filter,
  from,
  map,
  mergeAll,
  mergeMap,
  observeOn,
  pipe,
  shareReplay,
  take,
  withLatestFrom,
} from "rxjs"
import {
  Decoder,
  getChecksumBuilder,
  getDynamicBuilder,
} from "@polkadot-api/metadata-builders"
import { concatMapEager, shareLatest } from "@/utils"
import {
  AccountId,
  Codec,
  SS58String,
  blockHeader,
} from "@polkadot-api/substrate-bindings"
import { getBestBlock$, getBestBlocks$ } from "./streams/best-block"

export type { BlockHeaderWithHash } from "./streams/best-block"

export interface RuntimeContext {
  checksumBuilder: ReturnType<typeof getChecksumBuilder>
  dynamicBuilder: ReturnType<typeof getDynamicBuilder>
  events: {
    key: string
    dec: Decoder<any>
  }
  accountId: Codec<SS58String>
}

export default (chainHead: ChainHead) => () => {
  const { getFollower, unfollow, follow$ } = getFollow$(chainHead)

  const lazyFollower = withLazyFollower(getFollower)

  const { runtime$, candidates$: runtimeCandidates$ } = getRuntime$(follow$)
  const _finalized$ = getFinalized$(follow$)
  const bestBlock$ = getBestBlock$(follow$)

  const { withUnpinning$, unpinFromUsage$ } = getWithUnpinning$(
    _finalized$,
    follow$,
    lazyFollower("unpin"),
  )

  const withOptionalHash$ = getWithOptionalhash$(_finalized$)
  const { withRecovery, withRecoveryFn } = getWithRecovery()
  const commonEnhancer = <A extends Array<any>, T>(
    fn: (
      key: string,
      ...args: [...A, ...[abortSignal: AbortSignal]]
    ) => Promise<T>,
  ) =>
    withOptionalHash$(withUnpinning$(withRecoveryFn(fromAbortControllerFn(fn))))

  const call$ = commonEnhancer(lazyFollower("call"))
  const body$ = commonEnhancer(lazyFollower("body"))
  const storage$ = withOperationInaccessibleRecovery(
    commonEnhancer(lazyFollower("storage")),
  )

  const lazyHeader = lazyFollower("header")
  const header$ = pipe(
    withUnpinning$((hash: string) => from(lazyHeader(hash))),
    map(blockHeader.dec),
  )

  const recoveralStorage$ = (
    hash: string,
    queries: Array<StorageItemInput>,
    childTrie: string | null,
    isHighPriority: boolean,
  ): Observable<StorageItemResponse> =>
    new Observable<StorageItemResponse[] | Observable<StorageItemResponse>>(
      (observer) =>
        getFollower().storageSubscription(
          hash,
          queries,
          childTrie ?? null,
          (items) => {
            observer.next(items)
          },
          (error) => {
            observer.error(error)
          },
          () => {
            observer.complete()
          },
          (nDiscarded) => {
            observer.next(
              recoveralStorage$(
                hash,
                queries.slice(-nDiscarded),
                childTrie,
                true,
              ),
            )
          },
        ),
    ).pipe(mergeAll(), withRecovery(isHighPriority))

  const storageQueries$ = withOperationInaccessibleRecovery(
    withOptionalHash$(
      withUnpinning$(
        (hash: string, queries: Array<StorageItemInput>, childTrie?: string) =>
          recoveralStorage$(hash, queries, childTrie ?? null, false),
      ),
    ),
  )

  const metadata$ = getMetadata$(call$, runtime$, _finalized$)
  const runtimeContext$ = runtime$.pipe(
    map(() => {
      const result = metadata$.pipe(
        filter(Boolean),
        map((metadata): RuntimeContext => {
          const checksumBuilder = getChecksumBuilder(metadata)
          const dynamicBuilder = getDynamicBuilder(metadata)
          const events = dynamicBuilder.buildStorage("System", "Events")
          return {
            checksumBuilder,
            dynamicBuilder,
            events: {
              key: events.enc(),
              dec: events.dec,
            },
            accountId: AccountId(dynamicBuilder.ss58Prefix),
          }
        }),
        take(1),
        shareReplay(1),
      )
      result.subscribe()
      return result
    }),
    shareLatest,
  )

  // calling `unfollow` also kills the subscription due to the fact
  // that `follow$` completes, which makes all other streams to
  // also complete (or error, in the case of ongoing operations)
  metadata$.subscribe()

  const currentFinalized$ = new Observable<
    Record<string, Observable<RuntimeContext>>
  >((observer) => {
    let latestRuntimeCtx: Observable<RuntimeContext>
    const toRemove = new Set<string>()
    const result: Record<string, Observable<RuntimeContext>> = {}

    const sub1 = runtimeContext$.subscribe({
      next(v) {
        latestRuntimeCtx = v
      },
      error(e) {
        observer.error(e)
      },
    })

    const sub2 = unpinFromUsage$.subscribe({
      next(v) {
        v.forEach((x) => {
          if (result[x]) delete result[x]
          else toRemove.add(x)
        })
      },
      error(e) {
        observer.error(e)
      },
    })

    const sub3 = _finalized$.pipe(observeOn(asapScheduler)).subscribe({
      next(v) {
        if (toRemove.has(v)) toRemove.delete(v)
        else result[v] = latestRuntimeCtx
        observer.next(result)
      },
      error(e) {
        observer.error(e)
      },
      complete() {
        observer.complete()
      },
    })

    return () => {
      sub3.unsubscribe()
      sub2.unsubscribe()
      sub1.unsubscribe()
    }
  }).pipe(
    map((x) => ({ ...x })),
    shareLatest,
  )

  const getRuntimeContext$ = withOptionalHash$((hash: string) =>
    currentFinalized$.pipe(
      withLatestFrom(runtimeCandidates$),
      take(1),
      mergeMap(
        ([x, runtimeCandidates]) =>
          x[hash] ??
          (runtimeCandidates.has(hash) ? EMPTY : Object.values(x).slice(-1)[0]),
      ),
    ),
  )
  currentFinalized$.subscribe()

  const bestBlocks$ = getBestBlocks$(bestBlock$, _finalized$, header$)

  const finalizedHeader$ = _finalized$.pipe(
    concatMapEager((hash) =>
      header$(hash).pipe(map((header) => ({ hash, header }))),
    ),
    shareLatest,
  )
  finalizedHeader$.subscribe()
  const finalized$ = finalizedHeader$.pipe(map((x) => x.hash))

  return {
    finalized$,
    finalizedHeader$,
    bestBlock$,
    bestBlocks$,
    follow$,
    runtime$,
    metadata$,
    body$,
    call$,
    storage$,
    storageQueries$,
    unfollow,
    getRuntimeContext$,
  }
}
