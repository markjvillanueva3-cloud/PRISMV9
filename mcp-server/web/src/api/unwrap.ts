/**
 * unwrapPrism -- normalize the two PRISM HTTP response envelopes into their payload.
 *
 * The backend emits TWO shapes depending on the route family:
 *   - erp / business routes (bizRoute / bizGet in src/routes/erp.ts, and the explicit
 *     `res.json({ ok, data })` routes): { ok: true, data: <payload> }
 *   - calc / physics routes: { result, safety, meta }  (the PrismResponse type)
 *
 * Every client fn in api/client.ts is typed `Promise<PrismResponse>` but returns the RAW
 * route JSON, so a page reading `.result` from an erp `{ok,data}` route silently gets
 * `undefined` -- the data never loads, and the page often renders an empty / "unavailable"
 * state that wrongly looks like a backend fault. This helper reads whichever field the
 * route actually sent.
 *
 * `.data ?? .result` is safe for BOTH envelopes: an erp response has `.data` (and no
 * `.result`), a calc response has `.result` (and no `.data`), so the nullish coalescing
 * always selects the field that is actually present. Mirrors the long-standing
 * `(res as any).data ?? (res as any).result` idiom in KanbanBoardPage / RootCausePage,
 * promoted here to one tested, reusable helper.
 */
export function unwrapPrism<T = unknown>(res: unknown): T | undefined {
  if (res == null || typeof res !== 'object') return undefined;
  const r = res as Record<string, unknown>;
  return (r.data ?? r.result) as T | undefined;
}
