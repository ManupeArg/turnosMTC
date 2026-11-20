# activity-guest-range-tiers

**Status:** draft, awaiting re-review. **No code is in any repo** — the four
trees are clean on `dev`.

A full implementation of this model was written on 2026-11-13 and reverted the
same day: it typechecked in all four repos and frontend-be's suite passed (61
files, 498 tests), but a spec is approved before it is built. It is parked as
four `git apply`-clean patches plus the DDL at
`~/Desktop/FRONT_BE/_guest-range-tiers-v2-patches/`. Approval therefore does not
mean starting from zero, and rejection costs nothing but those patches.

Three points were decided by the author rather than waiting for an answer — see
OQ4, OQ6 and OQ7, each marked "author's call".
**Owner:** manuel
**Asana:** Grand Mountain — missing features `1220142475076975` (points 1 and 6) ·
Bacalari — "Extra guest pricing" `1219777776672114` · Bacalari — packages /
activities questions `1220271947958626`
**Affected repos:** property-service, booking-service, frontend-be, frontend-be-admin
**Depends on:** business confirmation of the five claims in Open questions.
Nothing technical.
**Impl plans:** pending (one per repo, to be written after this spec is approved)

> Supersedes `property-service/specs/activity-guest-range-tiers.md` and
> `property-service/specs/activity-extra-guest-pricing.md`. Both are flat files
> outside the template; the first is replaced by this document, the second was
> already marked superseded. Reviewed 2026-11-13, outcome "changes requested"
> (mostly the data model); this is the rework.

## Summary

An activity option (the base row, and each tier) gets a hard guest range and,
optionally, a per-head charge above a covered block. Two hotels need it for
different shapes: Bacalari prices one boat tour at a flat rate for the first N
guests plus a per-head charge after that, and Grand Mountain prices one event
in guest-count brackets. Today neither can be sold without one product per
bracket.

Nothing changes for an existing activity: the range is enforced only when a new
per-activity flag is on, and the charge exists only when two new nullable
columns are set.

## Problem / context

Two asks from two properties that turn out to be the same feature.

**Bacalari** (`1219777776672114`): a private boat tour at 3,750 MXN covering 1
to 6 guests, plus 300 MXN for each guest after the sixth. One option, a covered
block, a per-head charge above it.

**Grand Mountain** (`1220142475076975`, point 1): an event priced in brackets —
20 guests, 30–40, 80–100 — where the price is flat inside a bracket. The same
ticket's point 6 is per-person pricing that depends on group size: a private
tour at 900 MXN per person for 2–3 guests and 600 MXN per person for 4.

The operator's workaround today is one activity per bracket, which turned five
products into fifteen, and nothing stops a guest booking the 20-guest option
and arriving with 80.

## Current state

Verified in code on the checkouts named under *Anchor validity*. Everything in
this section is what the code does today, not what it is believed to do.

### What already works

Tiers hold one price curve each and are in production for Bacalari. A tier is a
row in `Activities` with `baseActivityId` set; `minAttendees` and `maxAttendees`
are per-row columns and are **not** in `ACTIVITY_FIELD_KEYS`
(`property-service/src/types/activities.ts`), so each tier already owns its own
pair rather than inheriting the base's.

### What does not work

**`minAttendees` has no write path.** The column is `NOT NULL DEFAULT 1`
(`src/models/activities.ts`), `createActivity` writes the literal `1` with the
comment `// Field is missing ?`, and `updateActivity` does not write the field
at all. `attendeesSchema` (`src/validators/activities.validator.ts`) accepts
only `maxAttendees` and `maxQuantity`. No stored row can leave 1.

**A tier's range never reaches a client.** `TierSourceRow` /
`buildTierResponses` (`src/helpers/activityAxes.helper.ts`) carry
`id, shortTitle, description, images, activityCode, pricePerDay` — no attendees
block. Worse, `asTierPrice` (`src/services/activities.service.ts`) spreads the
**base's** `attendees` through untouched when a tier is priced by id. So even
once tiers have their own ranges, booking-service would read the base's.
*This was not named in the review and is a prerequisite for everything below.*

**`maxAttendees` is not a cap anywhere.** It feeds `defaultQuantity`
(`property-service/src/helpers/activityFields.helper.ts`), where `perUnit` →
`ceil(party / maxAttendees)` — i.e. it already means *seats per unit* — and it
is a suggestion the guest edits, never a constraint. The real gate is the 409 at
cart and confirm, and no 409 today looks at attendees.
`booking-service` `validateActivitySelection` computes `attendees` and returns
it without bounding it; `booking-service/src/validators/cart.ts` accepts
`attendees: z.number().int().positive().optional()` with no maximum.

**There is no per-head charge.** No column, no formula, nothing.

**The wire carries a typo.** property-service emits both `minAttendees` and the
legacy `minAttandees`; booking-service reads only the typo, in exactly two
places (`cart.service.ts`, the standalone and package pricing paths).

**The front end does not bound the party.** The party-size select in
`ActivityAxesFields.tsx` is rendered only when `priceBasis !== "perPerson"`, its
option count is `max(1, partySize, (attendees?.maxAttendees || 10) × quantity)`
— a hardcoded fallback of 10 — and it has no lower bound. On the `perPerson`
path there is no party select at all; quantity is bounded by stock and by
`activityDetails.minQuantity`, which is a different field.

## Decision & design

### The model

Per option — the base activity row and each tier row:

| Field | State | Meaning |
|---|---|---|
| `minAttendees` | exists, no write path | Smallest party the option accepts. Hard. |
| `maxAttendees` | exists, written today | Largest party the option accepts. **Hard cap.** |
| `includedAttendees` | **new**, nullable | How many heads the price covers. |
| `extraAttendeePrice` | **new**, nullable | Charged per head above `includedAttendees`. |

Rules on one row, expressible as a single-row CHECK:

- `minAttendees <= maxAttendees`
- `includedAttendees` and `extraAttendeePrice` are both set or both null
- `includedAttendees <= maxAttendees`

Surcharge, per line:

```
multiplier = priceBasis === "perBooking" ? 1 : quantity
extraHeads = max(0, attendees − includedAttendees × multiplier)
surcharge  = extraHeads × extraAttendeePrice × days
```

`maxAttendees` is a cap and nothing else. `includedAttendees` is the covered
block and nothing else.

Worked examples:

| Case | min | included | max | price | Party | Total |
|---|---|---|---|---|---|---|
| Bacalari, one option | 1 | 6 | 11 | 3,750 | 8 | 3,750 + 2×300 = 4,350 |
| Grand Mountain 30–40 | 30 | 40 | 100 | see OQ3 | 33 | flat |
| Grand Mountain 30–40 | 30 | 40 | 100 | see OQ3 | 45 | flat + 5 × rate |
| Private tour, perPerson | 2 | — | 3 | 900 p/p | 3 | 2,700 |
| Private tour, perPerson | 4 | — | 4 | 600 p/p | 4 | 2,400 |

### Why the previous model was wrong

The reviewed draft used `maxAttendees` as both the covered block and the cap,
and derived a sibling-wide "capacity" as the real ceiling. Four consequences,
all accepted:

1. **A single-option activity can never reach the surcharge.** With no tiers,
   capacity equals the option's own max, so the party can never exceed the
   covered block. That is precisely the Bacalari ask, and the old model could
   not express it. This alone is fatal.
2. **The top bracket can never reach it either**, for the same reason.
3. **With no surcharge configured the bracket max was not validated**, so
   point 1 of the Grand Mountain ticket was not actually solved.
4. **One party could get two prices** — party 8 on the base plus surcharge, or
   the "8 personas" tier. The old draft accepted this as a decision; it was a
   symptom of the conflation, not a trade-off worth taking.

The split also matches existing precedent: rooms separate `pricing` from
`perAdult`, and the activity-options follow-up reached the same shape.

### The flag — `enforceGuestRange`

Range enforcement is gated by `enforceGuestRange`, a new per-activity boolean,
`NOT NULL DEFAULT false`, inherited by tiers (so it goes **in**
`ACTIVITY_FIELD_KEYS`, while the two new columns stay **out** of it).

It gates the **range only**. The surcharge is gated by its own pair being set —
subject to the refinement below, which requires the flag for the pair to be
settable at all.

The flag is not ceremony. The reviewer's production figures — 177 activity rows,
none with `minAttendees` other than 1, and 57 of 135 `perPerson` rows sitting at
`maxAttendees = 1` because that is the admin's default — mean that enforcing
`maxAttendees` as a cap without a flag would instantly refuse any `perPerson`
booking of two or more people on 57 live activities. The old draft's opt-in
("the activity has a `minAttendees`") does not exist in the data: every row has
1 because the column is `NOT NULL DEFAULT 1` and nothing ever wrote it.

**Refinement (new, not in the review):** the surcharge pair may only be set on
an activity whose flag is on. The two are presented as independent in the
review, and they are not: with the cap unenforced, a party of 100 on a six-seat
boat is accepted and billed 94 surcharges. The surcharge only has meaning
relative to a bracket that is actually enforced. Rejected at write time (400).

### Selection: party size first

The booking engine asks the party size, then offers only the options whose range
contains it. Option-first makes "no option for this group size" unreachable —
the party select would be bounded by whichever option the guest already picked —
and that state is the honest answer for Grand Mountain's uncovered 21–29 band.
The engine does not round: rounding up overcharges silently, rounding down
undercharges.

**Asymmetry that must be handled:** inside a package the option is chosen by the
hotel, not the guest (`asTierPrice`; `PackageDetails.tsx` renders the tier
read-only). There is no option list to filter. The party is simply validated
against the fixed option's range, and a party outside it is the same 409.

### AMENDMENT 2026-11-19 — the cap is derived, not typed

> **This changes a point the 2026-11-13 review marked as decided** (point 1:
> "`minAttendees`..`maxAttendees` is a hard range per option"). It needs the
> reviewer's agreement before it is built. Everything else in this spec is
> unaffected.

Business requirement, 2026-11-19: *"if there is a tier for 30 to 40 and another
for 50 to 60, the most a guest should be able to pick is 49."*

The operator should enter only what the hotel actually states — the brackets —
and never a third number. So a tier's cap is **derived**:

```
effective cap of a tier = (next tier's minAttendees) − 1
effective cap of the highest tier = the activity's capacity
```

"Next" means by ascending `minAttendees`, not by `orderIndex`.

What the operator configures per tier drops to three fields: `minAttendees`,
`includedAttendees` (the top of the flat price, the number in the label) and
`extraAttendeePrice`. `maxAttendees` stops being an input for a tier.

| Tier as the hotel states it | min | included | derived cap | Covers |
|---|---|---|---|---|
| "20 people" | 20 | 20 | 29 | 20 flat · 21–29 with surcharge |
| "30–40" | 30 | 40 | 49 | 30–40 flat · 41–49 with surcharge |
| "50–60" | 50 | 60 | capacity | 50–60 flat · above with surcharge |

**This removes the gaps by construction.** OQ5 (21–29 and 41–79 uncovered)
dissolves: every party size between the lowest `minAttendees` and the capacity
falls in exactly one tier. No rounding, no "no option for this group size"
except below the smallest minimum or above the capacity.

**Two cases still need a declared number**, and both are the same number — the
activity's capacity, which is what `maxAttendees` on the BASE row already means:

1. **The highest tier** has no next tier.
2. **A single-option activity** has no tiers at all. Bacalari is exactly this:
   3,750 covering 1–6 plus 300 per extra guest, one option, and the boat holds
   11. Without a declared capacity the surcharge would run unbounded.

So the shape is: **one capacity per activity, brackets per tier, caps derived in
between.**

#### Consequences to handle

- **Editing one tier silently changes another's range.** Adding a tier at 45–48
  drops the 30–40 tier's cap from 49 to 44. That is the intended behaviour, but
  the Admin must *show* each tier's derived cap, or the operator will not see it.
- **Overlapping minimums become invalid**, not merely ambiguous: the derivation
  needs a total order. Two tiers with the same `minAttendees` is a 400. This
  resolves OQ4 in the opposite direction from the author's earlier call —
  overlap is now rejected rather than tolerated.
- **The price inversion is still possible and is still the hotel's to avoid.**
  With a 500 surcharge, 75 guests on a 30–40 tier at 10,000 cost 27,500 while
  the 80–100 tier charges 25,000 flat — so the party is better off inventing
  five guests. Deriving the cap does not fix this; it is a consequence of the
  hotel's own numbers and belongs in the Admin as a warning at most.
- **`perUnit`** needs care: with the cap derived, "scale per unit" applies to
  the derived value. See the section below.

### `perUnit`

`maxAttendees` and `includedAttendees` scale per unit; `minAttendees` applies
once to the line. Two eight-seat boats cap at 16 and cover 16. This makes
`defaultQuantity` (`ceil(party / maxAttendees)`) consistent with the cap rather
than in conflict with it.

### `perPerson` and ticket point 6

Under `perPerson` the quantity **is** the head count, so the range bounds the
quantity directly and the surcharge is meaningless — every head is already
billed. The surcharge pair is rejected under `perPerson` (400), as in the
reviewed draft.

Point 6 is then expressed with ranges alone: a tier per price band, each with
`min = max = band` or a narrow range, both new columns null. Party 3 resolves to
the 2–3 tier at 900 per person; party 4 resolves to the "4" tier at 600 per
person. No new mechanism.

### Days

The surcharge multiplies by the number of priced days, like the base price.
Activities are single-day today (`checkIn = checkOut = bookingDate`), so this is
**unobservable in production** and can only be asserted in a unit test. It is
written down because `pricesPerDay` is an array and silently assuming its length
is 1 is how that assumption stops being true.

### The "from" amount and the promo base

Two call sites of `computeActivityPrice` have no party size to pass, and each
needs an explicit answer:

- **The package "from" amount** (`booking-service/src/utils/packageListing.ts`)
  has no attendees in scope at all. Decision: **the "from" amount never includes
  a surcharge.** It is the cheapest the package can be, and the cheapest party
  is one that fits inside the covered block. No party is assumed.
  Consequence to handle: `savesAmount` on the package path is built the same way
  from `originalPrice × multiplier + extrasTotal`, so a surcharge added to the
  total but not to `savesAmount` would make the struck-through "was" price lower
  than the price charged. `savesAmount` must include the surcharge even though
  "from" does not.
- **The promo base** (`booking-service/src/utils/promoDiscount.ts`). Decision:
  **the surcharge is outside the promo base.** `promo-discount-breakdown` D5
  already states the discount applies to the room/activity rate only and never
  to add-ons or fees, and its breakdown is computed as
  `Σ_days (originalPrice − pricePerDay) × quantity`, a per-day × quantity shape
  the surcharge does not have. Including it would change that spec's persisted
  gross. This is conservative for the hotel (a 10% promo on a 4,750 booking
  discounts 4,000) and needs business sign-off — see OQ6.

### Tax

The surcharge is taxed, like extras.

This is not free. Extras are taxed today by folding `extrasTotal` into an
"off-day amount" that is spread per unit onto the first day's price before
`calculateTaxesPerDay` runs — and that is done **twice, independently**, once on
the standalone path and once on the package path (`calculatePackageActivityTaxes`).
A surcharge that is added to the line total but not to both spreads escapes tax
with no test failing. Hence the mandatory tax cases in Testing.

### Snapshot

`buildActivitySnapshot` (`booking-service/src/services/cart.service.ts`) writes a
whitelist, so unlisted keys are dropped at confirm without error. It already
stores `minAttendees` and `maxAttendees`. Add `includedAttendees`,
`extraAttendeePrice` and the computed `surchargeAmount` in this pass, even
though where the surcharge is *displayed* is deferred to design.

Without them the surcharge is unrecoverable from a stored booking: the only way
back is `lineTotal − Σ(dailyPrice × multiplier) − extrasTotal`, which is
contaminated by promo rounding (`lineRemainder`) and fees. It also matters that
`packageRoomShare` (`booking.service.ts`) derives the room's share as the
package total minus the sum of activity `lineTotal`s — a surcharge missing from
`lineTotal` is silently attributed to the room.

`buildActivityBookingEntry` carries a comment that consumers read the
`booking.confirmed.*` payload **by key order** (contract test). New keys are
appended last.

### `readActivityDisplay`

`booking-service/src/utils/activityPrice.ts` resolves
`maxAttendees: live?.maxAttendees || snapshot.maxAttendees`, i.e. **live wins**.
Once `maxAttendees` is a hard cap rather than a display hint, an existing
booking would show the hotel's *current* cap instead of what was sold, and 0 if
the activity is gone. Flip to snapshot-first with the live value as fallback:
the snapshot has carried `maxAttendees` since F11, so only pre-F11 rows take the
fallback. Included in scope.

### Alternatives discarded

| Option | Why not |
|---|---|
| Keep `maxAttendees` as covered block and derive a sibling capacity | The four defects above. |
| A new entity for "bracket" instead of reusing tiers | Tiers already carry a price curve, a PMS code, images and shared inventory. A parallel entity duplicates all of it. |
| Opt in by "the activity has a `minAttendees`" | Not expressible: the column is `NOT NULL DEFAULT 1` on every row. |
| Surcharge per bracket rather than per option | Not needed by either hotel; `extraAttendeePrice` is already per option, which is a superset. |

## Contracts

### API

`property-service/openapi.yaml`:

- `attendeesSchema` gains `minAttendees` (optional int ≥ 1),
  `includedAttendees` (nullable int ≥ 1) and `extraAttendeePrice` (nullable
  number ≥ 0). All three are **per option**, which is why they travel in the
  `attendees` block beside `minAttendees` / `maxAttendees` rather than in
  `activityDetails`.
- `activityDetails` gains `enforceGuestRange` (boolean). It is **per activity**
  and an `ACTIVITY_FIELD_KEYS` member, so a tier inherits it and a tier write
  that carries it is a 400.
- The tier response (`ActivityTierResponse`) gains `minAttendees`,
  `maxAttendees`, `includedAttendees`, `extraAttendeePrice`.
- The price response's `attendees` block carries the **booked option's** values.
  `asTierPrice` must overlay the tier's attendees instead of passing the base's
  through.
- 400s: `minAttendees > maxAttendees`; the pair half-set;
  `includedAttendees > maxAttendees`; the pair set with the flag off; the pair
  set under `perPerson`.

`booking-service`: new 409 `activity_attendees_out_of_range`, on both the
standalone and the package path, at cart-add and at confirm (one check, one code
path — `validateActivitySelection` is reached from both).

**Wire key:** the new code reads `minAttendees`, falling back to the legacy
`minAttandees`. The typo is emitted by property-service and read in exactly two
places in booking-service; removing it is scheduled as a follow-up, not done
here, so that an old booking-service against a new property-service keeps
working.

### Events

`booking.confirmed.*` payload shape is unchanged; amounts change. New snapshot
keys are appended last, per the key-order contract test.

Integrations are not touched in this pass (owner: Manu). One consequence to
record: where a consumer derives a unit price as `total / quantity`, the
surcharge lands inside it. The in-repo analogue is `activityItemUnitPrice` in
`frontend-be/core/lib/activityPrice.ts`, used for GA4, which would be inflated.

### Schema

`property-service/db/changes/2026-MM-DD-activity-guest-range-tiers.sql`, with the
`-- applied: dev pending, stg pending, prod pending` header.

Three new columns on `Activities`:

| Column | Type | Notes |
|---|---|---|
| `includedAttendees` | `integer NULL` | per option |
| `extraAttendeePrice` | `numeric(10,2) NULL` | per option; mirrors the money precision of `PricingActivities` |
| `enforceGuestRange` | `boolean NOT NULL DEFAULT false` | per activity, inherited by tiers |

`minAttendees` and `maxAttendees` already exist and need no DDL — what they
need is a write path and a meaning.

CHECK constraints, all expressible on a single row:
`minAttendees <= maxAttendees`; the pair both-set-or-both-null with
`includedAttendees` between 1 and `maxAttendees` and `extraAttendeePrice >= 0`;
and the pair only on a row with `enforceGuestRange` (the refinement above).

The nullable columns and a defaulted boolean are metadata-only, so no table
rewrite. Note for whoever writes it: the activity-axes DDL went to
`migrations/` (`20261009_activity_axes_poc.sql`); the convention is now
`db/changes/`. The file is not written yet — the DDL waits for approval, and a
working draft of it sits with the parked patches.

## Testing

### Automated

Seam: `computeActivityPrice` and `validateActivitySelection` are pure and
already unit-tested — that is the highest cheap seam. Tax and snapshot need the
cart service.

- **Flag off, every shared piece:** standalone, package, the package "from"
  amount, promo, and `perPerson` with `maxAttendees = 1` booking 2 or more.
  All must be byte-identical to today. This is the regression that protects the
  57 live rows.
- Single option with a surcharge (Bacalari): party 6 → flat, party 8 → flat + 2.
- Hard cap with a surcharge: party above `maxAttendees` → 409, not a bigger
  surcharge.
- Both new columns or neither; `includedAttendees > maxAttendees`; the pair with
  the flag off; the pair under `perPerson`. All 400.
- `perUnit` with quantity 2: cap and covered block both double, `minAttendees`
  does not.
- Surcharge combined with extras, with a slot `priceDelta`, and with a promo —
  separately and together.
- **Tax:** a surcharge is taxed on the standalone path and on the package path,
  asserted independently. Both, or the second one silently regresses.
- Package activity inside and outside the range → 409 with the same code.
- `savesAmount` includes the surcharge while "from" does not.
- Snapshot round-trip: confirm a surcharged booking, read it back, and
  reconstruct the surcharge from stored fields alone.
- Old frontend against new backend: an unmapped 409 must not be silently
  swallowed (see the frontend-be note below).
- Matrix: flag × `priceBasis` × standalone/package × cart-add/confirm.

### frontend-be, specifically

The new 409 is not in `ACTIVITY_ERROR_KEYS` (`core/lib/activityFields.ts`).
`activityErrorMessage` returns `null` for an unmapped code and the cart-add catch
then returns `false` with no toast — the guest sees nothing happen. The confirm
dialog also renders nothing. So the entry, all three message catalogues, **and**
the hardcoded key list in `test/unit/activityFields.test.ts` must land together;
`test/unit/messages.test.ts` will fail loudly, but the cart-add path fails
silently until the catalogues land.

`core/lib/activityPrice.ts` has five functions that total a line —
`computeActivityDisplayPrice`, `activityItemTotal`, `packageActivityLineTotal`,
`packageActivitiesTotal`, `activityItemUnitPrice` — with 16 non-test importers.
`packageActivityLineTotal` takes a `Pick<SelectedActivity, …>` that excludes
`partySize`, so the shape has to widen.

### Manual (dev/QA)

Each case names a dev property and activity. To be filled in when the impl plans
are written; the reviewed draft's cases were not numbered and did not name
fixtures, which is the gap being closed.

1. Bacalari "Tour Lancha Privado", flag on, `included` 6 / `max` 11 / rate 300 —
   party 6 → 3,750; party 8 → 4,350; party 12 → refused, message names 11.
2. Grand Mountain "Paquete Evento", brackets 20 / 30–40 / 80–100 — party 25 →
   "no option for this group size", no price, no add to cart.
3. Snorkel (5 tiers, flag off) — unchanged, free choice of tier, no gate.
4. A `perPerson` activity with `maxAttendees = 1`, flag off — still bookable for
   4 people.
5. The same activity with the flag on — refused, message names 1.
6. The Grand Mountain package containing a ranged activity — party outside the
   range refused at add, with a visible message, not a silent no-op.
7. A surcharged booking in the admin and in the confirmation payload — the
   surcharge is present and the tax matches.

## Out of scope

- **Where the surcharge is shown** in the booking engine — the amount, a
  breakdown line, any copy. Deferred to design. The total reflects it; the
  snapshot stores it so the display can be added later without a data migration.
- **Integrations** (Mews, Infor, SiteMinder). Owner: Manu. The shape does not
  change; amounts do.
- **Removing the `minAttandees` typo.** Follow-up.
- **A ranged activity resolving its bracket from room occupancy inside a
  package.** The hotel picks the option there; occupancy-driven resolution is a
  separate feature.
- **Raising `MAX_TIERS`** (Admin-only cap, currently 5). Only if a hotel needs
  more brackets than fit.

## Open questions

Everything in this block came to the spec second-hand and is in none of the
Asana tasks. None of it is a fact until business confirms it in Asana. The
design does not depend on OQ1–OQ5, but the configuration shipped to the hotel
does.

- [x] **OQ1 — does Grand Mountain charge a surcharge above the bracket?** →
      **Yes.** Business, 2026-11-19: "lleva recargo por persona por arriba del
      tramo". The ticket text, which lists the three brackets as flat prices
      with no mention of a surcharge, is therefore incomplete and should be
      updated.
- [x] **OQ2 — the surcharge amount.** → **Not a fixed number: the hotel sets
      it in the Admin, per option.** Business, 2026-11-19. This is already the
      design (`extraAttendeePrice` is a per-option column), so nothing changes;
      the question was only whether a single platform-wide figure was expected.
      Bacalari's 300 MXN stays the configured value for that activity.
- [ ] **OQ3 — 10,000 or 4,000 for the 30–40 bracket?** Still open, and now
      narrower: OQ1 settles that a surcharge exists, so the two figures are no
      longer describing two different mechanisms — one of them is simply the
      wrong number. The ticket says 10,000; the 2026-11-12 conversation said
      4,000. → waiting on business. Does not block building.
- [x] **OQ4 — the overlap. REVERSED by the 2026-11-19 amendment.** Deriving a
      tier's cap from the next tier's minimum needs a total order, so two tiers
      sharing a `minAttendees` is now a **400**, not something to tolerate.
      This overturns the author's earlier call below.
      Earlier call (no longer in force): overlapping
      ranges on one activity are NOT rejected today and the code does not
      reject them: with hard ranges and party-first selection the guest sees
      only the options that contain their party, so an overlap shows two
      priced choices rather than an undefined winner. Revisit if the reviewer
      wants a 400.
      Original question: The reviewed draft recorded "flagged to the client
      and accepted". No record of who accepted. Under the new model the overlap
      is largely gone (ranges are hard and selection is party-first), but
      brackets may still be configured to overlap and nothing rejects that
      today — decide whether overlapping ranges on one activity are a 400.
      → waiting on the reviewer.
- [x] **OQ5 — the 21–29 gap.** → **Dissolved by the 2026-11-19 amendment.**
      With the cap derived from the next tier's minimum, every party size
      between the smallest minimum and the activity's capacity falls in exactly
      one tier. There are no uncovered bands left to decide about.
- [x] **OQ6 — the promo base. AUTHOR'S CALL, pending confirmation.** The
      surcharge is OUTSIDE the promo base: the promo helpers are not passed the
      surcharge inputs at all, so their gross and net are surcharge-free by
      construction, and the standalone path adds it back as
      `promoLine.netAmount + price.extraAttendeeTotal`. Conservative for the
      hotel. Still a commercial decision.
      Original question: Confirm that a promo does not discount the
      surcharge. This is a commercial decision, not a technical one.
      → waiting on business.
- [x] **OQ7 — the admin's maxQuantity on tiers. AUTHOR'S CALL, pending
      confirmation.** The tier `Attendees` component was rewritten to show the
      option's range and covered block and NOT `maxQuantity`, which stays on
      the base only — tiers share the base's inventory
      (`activity-shared-inventory`), so a per-tier `maxQuantity` was never
      meaningful. It was previously hidden behind the flag, so no hotel can
      have been relying on it.
      Original question: Turning on `SHOW_TIER_ATTENDEES` also
      exposes `maxQuantity` on tiers, which share the base's inventory. The
      component must be split so tiers get the range and not `maxQuantity`.
      Confirm no hotel is relying on the current hidden copy.
      → waiting on the reviewer.
- [ ] **OQ8 — albie onboarding MCP, "slice 17".** The review lists it as work in
      flight on the same files. I could not find an onboarding MCP or any
      "slice 17" in `local-development` (`plugins/`, `apps/`, `docs/`,
      `system-design/`); the only plugin there is `albie-agent-tools`, which is
      read-only agent tooling and touches no activity data. → waiting on the
      reviewer for a pointer.

## Verification of the review's "not verified" list

The review asked for these to be checked and the result stated here.

**The author's patches and the DDL header.** Both checked. The four patches at
`~/Desktop/FRONT_BE/_guest-range-tiers-patches/` still apply cleanly to `dev`
(`git apply --check`, all four). **They are nonetheless obsolete:** they contain
88 occurrences of `extraGuestPrice` and 42 of `capacity`, and zero of
`includedAttendees` / `extraAttendeePrice`. They implement the model this rework
replaces. They are worth keeping only as a map of which files a change like this
touches, not as a head start — the formula, the column, the capacity derivation
and the absence of a flag are all wrong under the new model. The DDL header
format was correct (`-- applied: dev pending, …`) but the filename slug
(`2026-11-12-activity-extra-guest-price.sql`) did not match the spec slug.

**`defaultQuantity` and `readActivityDisplay`.** Both claims hold, see *Current
state* and *Decision & design*. `defaultQuantity` already treats `maxAttendees`
as seats-per-unit, which the `perUnit` rule makes consistent rather than
contradictory. `readActivityDisplay` is live-first and needs flipping; I found
no comment justifying the live-first order, so the F11 rationale is inferred
from the neighbouring comment about snapshots, not stated.

**Tax over the surcharge.** Confirmed taxable-by-omission risk: extras are taxed
today, a surcharge would not be, and the fix is two independent edits. Covered
above and in Testing.

**Mail itemization.** No confirmation email is built in booking-service — its
`email.service.ts` only sends the daily report. The contract is the
`booking.confirmed.*` payload, consumed downstream. The only in-repo itemizer is
`booking-csv.ts`, which prints one row per activity line with a total and no
component breakdown. **Could not determine** the mail template; it is outside
these four repos.

**The promo-discount-breakdown diff.** There is no `promoDiscount.ts` named in
that spec — it names `applyPromoCode`, `discountRoomPrices`,
`discountActivityPricePerDay`, `processRoomPrice` / `processActivityPrice` /
`processPackagePrice`, and `createPendingBookings`. The conflict is real but
narrow: both features land in `processActivityPrice` and both care about what
`originalPrice` means. Resolved by the decision above (surcharge outside the
promo base); the owner of that spec should confirm.

**albie-mcp impact.** See OQ8 — could not determine.

## Anchor validity

The review's anchors were read on `origin/dev` at property-service `b42c3eb`,
booking-service `cc1acf5`, frontend-be `e486e84e`, frontend-be-admin `ddda59f0`.

**All four differ from the checkouts available to me**, which are at `3d7a206`,
`f47f6e7`, `086ddc2a` and `249ef00b` respectively, and `git fetch` is not
available from this environment (SSH to the remote is refused), so I could not
pull the reviewed commits. Everything in *Current state* and *Verification*
above was read on the older checkouts named here.

Practical consequence: **cite symbols, not line numbers.** This document
deliberately names functions, constants and files rather than line numbers, so
it survives the drift. Anyone implementing should re-read the anchors on current
`origin/dev` before quoting one. The production figures in *The flag* (177 rows,
57 of 135 `perPerson` at `maxAttendees = 1`) come from the review; I have no
database access and did not verify them.

## Post-implementation notes

—
