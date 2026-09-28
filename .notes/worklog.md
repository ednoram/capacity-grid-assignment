# Worklog

Running notes on how this got built — decisions, assumptions, dead ends, and anything
left unfinished. Append as you go; a line or two per entry is right.

---

## GET /api/capacity

- Seed people 1–5 are hand-built edge cases (weekend-spanning, cross-week, overlapping, zero
  capacity). Assignments are split into up to 15 identical fractional rows — sum them, never dedupe.
- Only Mon–Fri count towards allocation: `weekly_hours` is a five-day week. Counting weekends
  would put Ana at 56/40 for a Mon–Sun 8h/day booking. Holidays aren't modelled.
- Range is widened to whole Mon–Sun weeks and echoed back; capped at 26 weeks per request so a
  roster of a few thousand stays a bounded response.
- Capacity is returned per person, not per cell: the schema has one `weekly_hours` with no
  history, so editing it rewrites past weeks too. Effective-dated capacity would fix that.
- First query expanded assignments into days with `generate_series`: ~165ms, 140ms of it JIT
  triggered by bad row estimates, and the date/interval overload silently ran on `timestamptz`.
  Replaced with overlap arithmetic per (assignment, week): ~5ms for 3 weeks, ~28ms for 26.
  Verified against an independent script over all 57 seeded weeks (41,500 cells, 0 mismatches).
- Names sort with ICU collation (`und-x-icu`); the default `en_US.utf8` on Alpine is byte order.
- Deferred: paging people for very large rosters; `(start_date, end_date)` btree only narrows
  on one side — a GiST index on `daterange` would suit two years of history (schema is fixed).
- Review pass: weeks are computed once in Go and passed to the query as `date[]`, so the response
  and the SQL can't disagree. Dropped the range pre-filter — the per-week join already drives the
  index (3.4ms vs 5.0ms). Rounding left to the UI. pgx `CollectRows` covers what sqlx would add.

## PATCH /api/people/{id}

- Returns the updated person (`id, name, weeklyHours`) — the same shape as a capacity row minus
  `allocated` (`personCapacity` embeds `person`). Allocations don't depend on `weekly_hours`, so
  the client can merge this into the rows it holds; no range refetch needed.
- Accepts 0–168 hours: 0 is a real value in the seed (Eli), 168 is the only hard ceiling. Unknown
  fields are rejected so a typo like `weekly_hours` fails loudly instead of being ignored.
- Last write wins. With several managers editing, an `updated_at`/version check (409 on conflict)
  would be the next step.

## Grid, fixed range

- Layout is by feature: `features/capacity/` holds the grid, its API call and the allocation
  rule; `lib/api-client.ts` is the shared HTTP layer. The timeline view will be a sibling feature.
- Over-allocated cells are red and show the overage (`+5`), so it doesn't rely on colour alone.
  Any booking against 0 capacity counts as over (Eli). Hours are shown per week, capacity once
  per row, rather than repeating `x / 40` in every cell.
- Requests that fail with 4xx aren't retried; network errors and 5xx are retried twice. A failed
  background refresh keeps the last numbers on screen with a notice rather than blanking the grid.
- Week headers: `new Date('YYYY-MM-DD')` is UTC midnight, so they're formatted with
  `timeZone: 'UTC'` — otherwise viewers west of UTC see the previous day.
- Styling with Tailwind v4 (Vite plugin, no config file). First pass used plain CSS with
  hand-picked hex colours — replaced so colours come from one palette with dark variants, and the
  status → colour mapping lives in one table in the grid.

## Week navigation and range

- No API pagination or filtering. 500 people × 26 weeks measured 63KB, so a few thousand is
  ~400KB uncompressed (the API doesn't gzip yet); the query cost scales with weeks, not history. Paging alphabetically would also break the
  manager's actual question — who is over-committed — without server-side sorting. Worth adding
  once teams/departments exist to filter by; the schema has none.
- Deferred: row virtualisation. 500 rows is fine; at 3,000 × 28 columns (~84k cells) the DOM
  becomes the bottleneck. Sticky header + first column make virtualising a real `<table>` fiddly.
- Default range is this week plus seven: the point is seeing over-commitment before the week
  starts. The seeded edge cases (Dec 2025/Jan 2026) are reachable via the date inputs or URL.
- Range lives in the URL (`replaceState`, so week-stepping doesn't flood history). Invalid or
  oversized params fall back to the default rather than erroring.
- Navigating keeps the previous grid dimmed and `aria-busy` until the next range arrives;
  superseded requests are aborted via the query signal.
- Moving one end of the range past the other drags it along, and the UI clamps to 26 weeks —
  `MAX_WEEKS` mirrors `maxWeeks` in the Go API by hand.
- Date inputs emit `0002-01-05` while a year is being typed; years outside 2000–2099 are ignored
  so the range doesn't jump around mid-typing.
- Week headers now use date-fns like the rest of the date handling (dropped the UTC `Intl` trick).

## Editing weekly hours

- After a save the grid patches the cache from the PATCH response — no refetch. Allocations don't
  depend on `weekly_hours`, so the returned person is the whole change. Every cached range is
  patched, so navigating back doesn't show a stale value.
- Optimistic via the UI, not the cache: while pending, the row renders the mutation's variables
  (recoloured, dimmed, "Saving…"). The cache only holds confirmed values, so a failed save needs no
  rollback — the row falls back to the confirmed number and an inline error offers Retry/Dismiss.
- Race: a range fetch that started before the save could land after it with the old value. On
  success, any in-flight capacity fetch is invalidated (cancelled and refetched). Not covered by a
  test.
- Enter or blur saves, Escape cancels; invalid input keeps the editor open. The row is locked while
  its save is pending, so one person can't have two saves racing each other.
- Rows are memoised and the patch swaps only the edited person's object, so a save re-renders one
  row rather than the roster.
- With the API down the Vite proxy answers 502 text/plain; 5xx without a JSON error now reads
  "The server is having trouble" instead of a bare status code.
- `MAX_WEEKLY_HOURS` (168) mirrors `maxWeeklyHours` in the Go API by hand.
- First pass had no editing affordance (dotted underline only) and no pointer cursor — Tailwind v4
  preflight sets `cursor: default` on buttons. Restored globally, and the capacity cell now looks
  editable: pencil icon, hover border, "click to edit" in the header, key hints while editing.
- Enter/Escape return focus to the edit button (keyboard users kept losing their place). The button
  uses `aria-disabled` while saving because a `disabled` button can't hold focus.
- Regression from the focus fix, caught by manual testing: Chrome/Safari activate a focused button
  on Enter's `keypress`. Refocusing the edit button during Enter's `keydown` meant the same key
  press reopened the editor with the pre-save value. Fixed by cancelling the Enter keydown. jsdom
  doesn't emulate keypress activation, so the test asserts the keydown is cancelled instead.

## Structure pass

- Shared UI lives in `components/` (`Button` with variants, `ErrorNotice`, `PencilIcon`); shared
  infrastructure in `lib/` (`apiClient`, `queryClient`). Features keep only feature code.
  `CapacityGrid` split into the table and `PersonRow`. Components don't set their own outer
  margins — callers own layout. Files: PascalCase components, camelCase modules.

## Row virtualisation

- Measured before deciding: production build in headless Chrome, synthetic rosters served by
  request interception (DB and seed untouched), median of 3 runs on a fast Mac.

  | roster × weeks | first render   | DOM nodes    | edit → confirmed |
  |----------------|----------------|--------------|------------------|
  | 500 × 8        | 90 → 55 ms     | 7.8k → 545   | 52 → 34 ms       |
  | 3,000 × 8      | 275 → 57 ms    | 47k → 545    | 160 → 33 ms      |
  | 3,000 × 26     | 628 → 60 ms    | 111k → 1.1k  | 330 → 33 ms      |

  Scrolling was smooth either way. Edits were slow even with one-row React re-renders: the browser
  re-lays out the whole table.
- TanStack Virtual (headless, keeps the real `<table>`). Each person is its own `<tbody>` so the
  virtualiser measures the row plus its error line. Fixed column widths (`table-fixed`) —
  otherwise columns resize as different names scroll into view; long names truncate with a title.
- `aria-rowcount`/`aria-rowindex` so screen readers still get the roster size.
- Trade-off: browser find-in-page can't reach rows that aren't rendered. A name filter is the
  natural follow-up.
- jsdom has no layout, so the grid test stubs `offsetHeight`/`offsetWidth` for the virtualiser.
- Supersedes "Deferred: row virtualisation" under Week navigation.
- Caught in review: virtualisation unmounts off-screen rows, and save status lived in each row's
  `useMutation`, so scrolling away lost a pending save's lock (a second save could race it) and a
  failed save's error. Save status now lives in the mutation cache: `mutationKey` per person, rows
  read the latest with `useMutationState`. Failed saves use `gcTime: Infinity` so they wait for
  Retry/Dismiss instead of expiring off screen; starting a save prunes that person's settled saves,
  so the cache holds at most one per person. The cache patch is a mutation-level `onSuccess`, so it
  runs even if the row unmounted. Verified by remount tests and by scrolling away and back in
  headless Chrome; render cost unchanged.

## Formatting

- Two files had picked up an editor's Prettier defaults (double quotes, semicolons) and one was
  committed that way. Added Prettier (semicolons, single quotes, 120 columns) so editors and
  `npm run format` agree; `format:check` for CI.

## Offline and refetch tuning

- `networkMode: 'always'` for queries and mutations. The default pauses requests while
  `navigator.onLine` is false: an offline save sat on "Saving…" (locked, no error), and an offline
  first load sat on "Loading…". Now they fail into the existing error/Retry states. We only talk to
  our own API, and `navigator.onLine` is unreliable anyway; `refetchOnReconnect` still catches up.
- `staleTime: 60s` on capacity. Revisiting a range was already instant (cached data renders
  first); this removes the background refetch of up to ~400KB on each week step back and forth.
  Kept `refetchOnWindowFocus` — with a staleTime it only fires for data older than a minute, and
  it's how a manager sees colleagues' edits.
- Not added: mutation `scope` — two saves for one person can't overlap today (one row per person,
  locked from shared save state; Retry only after a failure). It's the tool if a second edit
  entry point (bulk edit) appears. Auto-retry on save — Retry is immediate and a retry only delays
  the error.
