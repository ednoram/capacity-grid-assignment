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
