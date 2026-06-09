# B Crew Staffing — Product Requirements (v1)

> Internal tool for a volunteer fire station's **B Crew** (Monday-night 12HR shifts;
> weekend shifts every 5 weeks alternating 24HR Sat 1800–Sun 1800 and 48HR Fri 1800–Sun 1800).
> This document is the agreed plan from the design review. It supersedes ad-hoc notes;
> update it as decisions change.

---

## 1. Goals

A single place for B Crew to:

1. **Availability** — FFs indicate in/out per shift (with cover requests).
2. **Board** — per-shift view of staffing, chores, and meals.
3. **Staffing** — officers assign who rides which unit/seat per shift.
4. **Chores** — per-shift chore responsibilities, including auto-generated EMS checks.
5. **Dinner** — per-meal cook sign-ups across the shift.
6. **Roster** — contact info, quals, ranks, and derived staffing history.

---

## 2. Users, roles & access

| Concern | Decision |
|---|---|
| **FF identity** | Trust-based **name select**, no login (current availability flow). |
| **Officer identity** | Supabase **magic-link login** (passwordless). |
| **Officer marker** | Explicit **`isOfficer`** flag on `Firefighter`, decoupled from rank. |
| **Account link** | **`supabaseUserId`** (nullable, unique) on `Firefighter`. |
| **Site privacy** | **Fully open / obscure URL.** No crew-wide gate. (Accepted PII tradeoff.) |

**Read (open, no login):** Board, Availability, Dinner, Roster.
**Open writes (trust-based, no login):** submit availability, dinner cook sign-up, BRIGADE MEETING toggle.
**Officer-gated writes (login):** staffing assignments, chore assignments, edit FF profiles, roster/unit/catalog admin.
**Dev/CLI only:** generate shifts, generate meals.

---

## 3. Data model

### Existing (with v1 additions)

**`Firefighter`**
- Existing: `id`, `name`, `rank` (`FirefighterRank`), `qualifications` (`Qualifications[]`), `isActive`, `isCover`, `createdAt`.
- **Add:** `isOfficer Boolean @default(false)`, `supabaseUserId String? @unique`, `phone String?`, `email String?`, `joinedAt DateTime?` (seniority).
- Covers are `Firefighter` rows with `isCover = true`; excluded from combobox/staffing pools (`where isCover: false`).

**`Shift`** — `id`, `shiftDate` (date), `shiftType` (`ShiftType` 12/24/48HR), `createdAt`. Owns `availability`, `meals`, `staffingAssignments`, `choreAssignments`.

**`Availability`** — `id`, `firefighterId`, `shiftId`, `status` (`AvailabilityStatus` in/out/`PENDING→''`), `trainingSuggestion`, `shiftNotes`, `submittedAt`, self-relation `coversFor`/`coveredBy` (one-to-one).
- **Cover flow:** an OUT submission creates a cover `Firefighter` (`isCover: true`, rank + quals from the form) and an `Availability` row (`status: IN`, `coversForId` → the OUT row).

### New entities

**`Unit`**
```
id, name            // TO88, E81, E82, E83, C89, B85
seats        Int
inService    Boolean @default(true)
carriesEms   Boolean @default(false)   // EMS checks only fan out to staffed carriesEms units
crossStaffGroupId Int?                  // membership in a cross-staff group
```
Seed: TO88 (5), E81/E82/E83 (6), C89 (4, carriesEms), B85 (2). Engines + C89 are `carriesEms = true`.

**`CrossStaffGroup`**
```
id, name      // "Tower", "Brush"
units Unit[]
```
- **Tower group:** E81, E82, E83, TO88. **Brush group:** C89, B85.
- **Primary = the staffed unit in the group with the most seats**; it holds the real assignments. Smaller units are cross-staffed implicitly (no separate staffing). When bodies run short, the tail of the crew simply doesn't cross-staff.

**`StaffingAssignment`** (always live — no draft/publish)
```
id, shiftId, unitId
seatNumber    Int    // 1..unit.seats
firefighterId
rotationOrder Int    // ordered list; seats can hold multiple FFs (informal rotation, no times)
```
- A unit's staffing is conceptually **N seats × M FFs/seat** (ordered lists). No seat roles, no time ranges.
- **Pool:** FFs marked IN (incl. covers) surface first; any active FF assignable, flagged "not marked in."
- Qualifications are **advisory display only** next to names (officer eyeballs EMS/driver coverage). `C89`/`B85` quals = "cleared to ride that rig" (distinct from same-named units).

**`Chore`** (catalog, configurable)
```
id, name           // CAD/Board, Trash, Laundry, Sweep & Mop Kitchen, Bathroom Restock, EMS Check
dueBy              // time-of-day (e.g. 18:15, 23:00)
perUnit  Boolean @default(false)   // EMS Check = true
sortOrder Int
isActive Boolean @default(true)
```

**`ChoreAssignment`** (assignment-only — no completion tracking)
```
id, shiftId, choreId
unitId        Int?   // set for perUnit chores (which unit's EMS check)
firefighterId Int?   // assigned by officer
```
- **EMS rule:** the `perUnit` "EMS Check" chore fans out **one assignment per staffed unit where `carriesEms = true`**.

**`Meal`** (separate object, rendered on the board with chores)
```
id, shiftId
dayOffset        Int        // days from shift start
mealType         MealType   // BREAKFAST | LUNCH | DINNER
cookId           Int?       // open self-serve sign-up
isBrigadeMeeting Boolean @default(false)  // catered, no cook needed
@@unique([shiftId, dayOffset, mealType])
```
- **`enum MealType { BREAKFAST, LUNCH, DINNER }`**
- **Meal template (code-level `Record<ShiftType, MealSlot[]>`):**
  - **12HR** → Mon Dinner (offset 0). *This is the slot that gets BRIGADE MEETING'd.*
  - **24HR** → Sat Dinner (0), Sun Breakfast (1), Sun Lunch (1).
  - **48HR** → Fri Dinner (0), Sat Breakfast (1), Sat Lunch (1), Sat Dinner (1), Sun Breakfast (2).
- BRIGADE MEETING is a per-`Meal` toggle (open/self-serve).

---

## 4. App structure & navigation

- **`/` — Board (landing).** Per-shift read view: staffing (units/seats), chores (incl. EMS fan-out), meals. Shift selector (calendar + stepper, as built). Surfaces **non-responders** for the shift.
- **Availability** — the existing form, refactored into a **reusable component**; FF picks name + in/out + cover request.
- **`/dinner`** — cook sign-up across dates + BRIGADE MEETING toggle (open).
- **`/roster`** — FF profiles: contact, quals, rank, and **derived** staffing/attendance history.
- **`/admin`** (login-gated) — edit roster + unit/chore/cross-staff catalogs.
- **Staffing form flow** (login-gated) — officers create per-shift seat assignments.

---

## 5. Scripts & tooling

- **`generateShifts`** (exists) — Mondays weekly (12HR); 24HR/48HR on the 10-week cycle; idempotent (`skipDuplicates`).
- **`generateMeals`** (new) — mirrors `generateShifts`; creates missing `Meal` rows from the template; idempotent via the `@@unique`.

---

## 6. Out of scope for v1 (deferred)

- Automated reminders (email/SMS) — v1 surfaces non-responders for manual nudging.
- Weather API and Google Sheets integrations — **dropped**; remove `WEATHER_API_KEY` and `GOOGLE_SHEETS_CREDENTIALS`.
- Chore **completion** tracking; dinner **eaters/cost** tracking.
- Typed positions / hard qualification requirements (quals are advisory only).
- Staffing **draft/publish** lifecycle (always live).
- Rank/qual **change audit log** (history is derived; `joinedAt` covers seniority).
- Crew-wide passcode gate.

---

## 7. Open / revisit later

- One-way export to a read-only sheet, if the crew misses the spreadsheet view.
- Email reminders once profile emails are populated.
- Fairness/rotation suggestions for chores (catalog data supports it).
</content>
</invoke>
