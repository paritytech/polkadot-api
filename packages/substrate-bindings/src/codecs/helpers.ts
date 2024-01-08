export const option = <
  T extends { tag: string; value: any },
  K extends T["tag"],
>(
  tag: K,
  value: (T & { tag: K })["value"],
): T => ({ tag, value }) as unknown as T
