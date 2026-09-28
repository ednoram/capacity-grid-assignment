# Decisions

Yours to write, not your AI's. Short is good — bullets are fine, and half a page is
plenty. We read this first.

## What did the spec not tell you?

There are things this brief doesn't specify. Which ones did you hit, what did you decide,
and why?

- **Whether weekends count.** Most assignments include weekend days, and `hours_per_day` doesn't
  say. I count Monday to Friday only, because `weekly_hours` describes a five-day week. Otherwise
  Ana's Monday-to-Sunday booking reads 56/40 instead of 40/40. It's also the decision that changes
  the answer most: counting all seven days roughly triples the over-allocated people in a busy week
  (~140 vs ~40). With weekdays only, generated full-timers can't exceed 40h (no double-booking, at
  most 8h a day), so every red cell is a part-timer or one of the hand-built edge cases (Dee, Eli).
  Allocation is summed per assignment-and-week overlap in a single query: a few milliseconds for 3
  weeks, about 20ms for 26.
- **What a week is.** Monday to Sunday. The API widens any range to whole weeks, returns the range
  it used, and caps a request at 26 weeks.
- **How the grid stays correct after a save.** Allocations don't depend on `weekly_hours`, so the
  PATCH response is the whole change: I patch it into every cached range instead of refetching.
  While a save is in flight the row shows the new value, but the cache only ever holds confirmed
  values, so a failed save falls back without a rollback and offers Retry or Dismiss. A range load
  still in flight when the save lands is cancelled and redone, so it can't bring the old value back.
  To see a failure, run `docker compose stop api` and try an edit.
- **Capacity has no history.** There's one `weekly_hours` per person, so editing it rewrites past
  weeks too. I left it as is. Concurrent edits are last write wins.
- **No pagination.** The whole roster for the range comes back (around 400KB uncompressed for a few
  thousand people over 26 weeks), and the grid only renders the visible rows. At 3,000 × 26 that
  took first render from 630ms to 60ms and each save from 330ms to 33ms. Paging alphabetically
  wouldn't help a manager find who is over-committed.
- **Default range.** The grid opens on this week plus the next seven, since the point is seeing
  over-commitment before a week starts. The seeded edge cases are at `/?from=2025-12-29&to=2026-01-18`.

## What did you notice that looked wrong?

Anything in the output that didn't match what you expected. Whether you fixed it or left
it, we want to know you saw it.

- Every third week has no bookings at all (the seed runs two weeks on, one off), so the default
  eight-week view always includes two or three empty columns (currently 12 Oct and 2 Nov 2026). The
  data ends on 3 Jan 2027, so after that the default view is empty; the URL above still shows real
  data. Both are the data, not the grid.
- Assignments are split into up to 15 fractional rows, most of them identical (e.g. 14 × 0.5 + 1.0
  = 8h a day). They look like duplicates but have to be summed.
- The first five people are edge cases: a booking across the year boundary that includes a
  weekend, a Friday-to-Monday booking, a one-day booking, overlapping bookings (Dee at 45/40), and
  Eli with 0 capacity and 20 hours booked, which shows as over-allocated. I checked the API against
  an independent script: 0 mismatches across 41,500 person-weeks.
- Ana's week of 29 December shows 40/40, which counts 1 January as a working day. Holidays aren't
  modelled; I left it.
- The database's default collation sorts by raw bytes, so "Sanne Öberg" comes after "Sanne
  Virtanen". The query sorts with ICU instead.

## What did the AI get wrong that you caught?

One concrete example. Every real session has one.

- After a keyboard-focus fix, pressing Enter to save reopened the editor with the old value, even
  though the save had gone through. Focus moved back to the edit button during the Enter keydown,
  and Chrome then activated that button on the same key press. The tests passed because jsdom
  doesn't do this. I only saw it by using the page. The fix was to cancel the Enter keydown.
- A close second: after rows were virtualised, each row kept its own save state, so scrolling away
  during a save unlocked the editor, and scrolling away from a failed save lost the error.

## What would you do differently with a week?

- Capacity with effective dates, plus holidays and time off.
- A version check on edits (409 on conflict) instead of last write wins.
- Name and team filtering, and an "only over-allocated" view. At a few thousand people that's how
  a manager actually works, and it stands in for find-in-page, which can't see rows that aren't
  rendered.
- Response compression, and one shared source for the limits that Go and TypeScript currently
  duplicate by hand (26 weeks, 168 hours).
