# Football 2027 Arcade Product Gate

## Product promise

Football 2027 is an accessible arcade football game with a compact club-building RPG wrapped around a deterministic physics core.

The game may use deep simulation internally, but the player should experience clear controls, fast decisions, visible consequences and short feedback loops.

## Non-negotiable experience targets

- Reach live play from launch in under 30 seconds after first-run setup.
- Create a coherent club with defaults in under 5 minutes.
- Explain any management decision in one sentence and one visible consequence.
- Keep normal live-play HUD coverage below roughly 25% of the viewport.
- Keep common management actions within three interactions from the career hub.
- Allow a meaningful match, upgrade or squad decision in a 10–15 minute session.
- Never require understanding hidden formulas to make a sensible choice.

## Feature admission test

A feature enters active development only when it passes at least three of these four gates:

1. **Feel** — does it make movement, contact, shooting, defending or presentation feel immediately better?
2. **Fantasy** — does it strengthen the fantasy of founding, playing for and growing a club?
3. **Clarity** — can the player understand the decision and outcome without reading a manual?
4. **Replayability** — does it create materially different choices, stories or match situations?

It must also satisfy all of these constraints:

- has a bounded vertical slice;
- has a deterministic or testable domain contract;
- does not duplicate an existing system;
- can degrade gracefully on lower-end browsers;
- does not block the first playable loop;
- has an explicit removal or simplification plan if it proves unfun.

## Core loop

1. Pick the next club decision.
2. Improve identity, squad, tactics or ground.
3. Play or quickly simulate a match.
4. Receive immediate rewards, consequences and story events.
5. Advance toward promotion and a visibly larger club.

Everything else supports this loop.

## Keep now

### On-pitch

- Responsive locomotion with readable weight and momentum.
- Ground, driven, lofted and through passes.
- Shooting with power, placement and modest spin control.
- First-touch quality, shielding and knock-ons.
- Weighty player contact with glance, stagger and fall outcomes.
- Goalkeepers, basic fouls, cards and essential restarts.
- Compact tactical identities with three to five meaningful choices.
- Replays, scorebug, crowd response and concise commentary.

### Club RPG

- Ground-up club creator.
- Procedural badge and kit design.
- Three to five authored founding players; generate the rest.
- Compact ground builder with visible capacity, atmosphere and facility effects.
- Regional lower-pyramid start and promotion journey.
- Squad selection, training focus, scouting choice and one weekly club decision.
- Club identity traits that emerge from repeated choices.
- Short story events with two or three options and clear trade-offs.

### Progression

- Match XP and role familiarity.
- A small number of player traits rather than dozens of opaque attributes.
- Ground and facility upgrades that visibly alter the venue.
- Supporter growth represented by a few readable audience segments.
- Club history, records and legends generated from actual save events.

## Simplify before shipping

- Full laws simulation becomes essential match rules first; VAR is presentation-only or deferred.
- Tactical depth becomes named philosophies plus a small set of situational instructions.
- Supporter simulation becomes four cohorts: core, local, family and travelling.
- Board politics becomes three visible priorities, not a simulated committee.
- Economy becomes cash, wages, weekly operating cost and upgrade commitments.
- Staff becomes a few named specialists with clear bonuses.
- Media becomes occasional high-value story events, not autonomous journalist simulation.
- Town simulation becomes regional modifiers and generated flavour, not full geography simulation.
- Stadium engineering becomes snap-together football modules, not free-form construction.
- Character creation uses presets and trade-offs, not face sculpting or 40 sliders.

## Defer

These are not active-roadmap features until the core loop is proven fun:

- Whole-country economic simulation.
- Parents, schools and family trees for generated players.
- Autonomous journalists, agents and sponsors as fully simulated actors.
- Full cloth, hair or muscle simulation.
- Persistent full-body ragdolls for every player.
- Complete 11v11 tactical simulation before smaller-sided gameplay is stable.
- Full VAR process simulation.
- Free-form stadium CAD.
- Mod marketplace or creator economy.
- Global football coverage before the English progression loop works end to end.
- Dozens of staff roles, board members or hidden personality metrics.

## Arcade physics rule

Physics should produce believable outcomes, not demand literal biomechanics.

- The authoritative simulation uses simple, stable body representations and deterministic impulses.
- Input assistance may shape intent, contact timing and targeting without teleporting outcomes.
- High-energy contacts can cause stagger or fall, but recovery must be quick enough to preserve flow.
- Visual ragdoll follows authoritative state and may never change possession, fouls or scoring.
- Ball flight and rolling should be physically coherent, then calibrated for readable fun.
- Any realism feature that makes controls sluggish without creating meaningful mastery is rejected.

## Management UI rule

- Show the decision, predicted effect and cost together.
- Default to presets and recommended choices.
- Put advanced detail behind one disclosure action.
- Use football language, not simulation terminology.
- Never surface raw internal variables unless in developer or analytics mode.
- Avoid dashboard sprawl: one primary task, one preview and one compact supporting area per screen.

## Vertical slice definition

The first production-quality slice is complete when a player can:

1. Create a club identity, kits, badge, ground and founding players.
2. Enter a generated regional division.
3. Select a squad and one tactical identity.
4. Play a responsive match with contact, goals, essential rules and replay.
5. Apply the result to standings, form, fatigue, XP, supporters and finances.
6. Make one upgrade or story decision.
7. Save, reload and continue to the next fixture.

## Pull request checklist

Every feature PR must answer:

- What player-facing loop becomes better?
- What is visible within the first 60 seconds of testing?
- What is the smallest shippable version?
- Which complexity was intentionally omitted?
- How is it tested deterministically or visually?
- What is its frame-time, memory or bundle impact?
- Can it be disabled without corrupting a save?

A PR that cannot answer these questions should remain a design issue, experiment branch or research document.
See also: [DEVELOPMENT.md](./DEVELOPMENT.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [CONTROLS.md](./CONTROLS.md).
