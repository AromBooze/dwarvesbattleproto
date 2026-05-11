# Battle Cart Prototype — Codex-Friendly GDD

This document describes the **current implemented prototype state**. For balance values, the source of truth is `src/config/balance/*`.

## 1. High Concept

A 2D real-time escort/defense prototype.

The player protects a cart moving through a dangerous road. The cart visually stays near the center of the screen while the background grid, resources, enemies, death effects, and combat anchors move from right to left.

The player commands two groups using a directional gaze cone from the cart:

- **Warriors** attack wolves.
- **Gatherers** collect wood and ore.

Between successful runs, the player may resurrect dead units, then spends resources on upgrades.

## 2. Prototype Visual Direction

- 2D browser-first game using Vite, React, TypeScript, and PixiJS.
- All game entities are static sprites.
- No frame-by-frame character animation is implemented.
- Use simple effects:
  - attack: quick scale bump;
  - taking damage: brief red flash;
  - death: blood puddle death effect;
  - gathering: progress bar and small sprite bounce;
  - cart damage: shake/flash.

## Visual Assets / Sprite Mapping

The project already contains a sprite atlas and extracted sprites for the current prototype art style.

Source files:
- `Sprites/battle_cart_sprite_atlas.png`
- `Sprites/battle_cart_sprite_atlas.json`
- `Sprites/battle_cart_sprite_atlas_README.md`

Current implementation uses extracted PNG files from `Sprites/individual_sprites`. Codex may later switch to atlas rendering with `Sprites/battle_cart_sprite_atlas.png` and `Sprites/battle_cart_sprite_atlas.json`, but should preserve these sprite IDs.

| Gameplay Object | Sprite ID | File | Notes |
|---|---|---|---|
| Cart | `cart` | `Sprites/individual_sprites/cart.png` | Main cart object. Kept near screen center. |
| Warrior | `warrior` | `Sprites/individual_sprites/warrior.png` | Dwarf warrior with helmet and sword. Formation in front of cart. |
| Gatherer | `gatherer` | `Sprites/individual_sprites/gatherer.png` | Dwarf gatherer with pickaxe. Formation behind cart. |
| Ore Resource | `ore` | `Sprites/individual_sprites/ore.png` | Ore resource node. |
| Tree Resource | `tree` | `Sprites/individual_sprites/tree.png` | Wood resource node. |
| Wolf | `wolf` | `Sprites/individual_sprites/wolf.png` | Generic wolf enemy. |
| Death Effect | `blood_puddle` | `Sprites/individual_sprites/blood_puddle.png` | World-attached death effect for dead warriors/gatherers/wolves. |

### Rendering Rules

| Rule | Current Implementation |
|---|---|
| Cart | Visually near screen center. |
| Formation units | Cart-relative. |
| Resources | World-attached; scroll right-to-left. |
| Wolves | Spawn world-attached; then move by target/chase logic. |
| Combat positions | World-attached combat anchor; anchor scrolls right-to-left. |
| Blood puddles | World-attached; scroll right-to-left and fade. |
| Pixel art | `image-rendering: pixelated`; Pixi textures use nearest scaling. |

Current art style target: **Simple NES-inspired pixel art**.

## 3. Core Gameplay Loop

1. Run starts.
2. Cart stays visually centered while grid scrolls.
3. Resources and wolf packs spawn from the right side.
4. Player commands gatherers and warriors using gaze direction.
5. Player survives until the run timer ends.
6. If the cart survives, remaining resources/wolves are cleared.
7. Living warriors/gatherers and the cart are fully healed.
8. If any units died, the resurrection screen opens.
9. Player may spend wood/ore to resurrect dead units from the completed run.
10. Unresurrected dead units are permanently lost when the player continues.
11. Player spends wood/ore on upgrades.
12. Player starts the next run.

Current note: next-run difficulty scaling is implemented after successful runs only.

## 4. Win / Lose Conditions

| Condition | Current Behavior |
|---|---|
| Cart HP <= 0 | Run phase becomes `gameOver`; spawning and simulation stop. |
| Timer reaches 0 while cart HP > 0 and units died | Run completes; resurrection screen opens. |
| Timer reaches 0 while cart HP > 0 and no units died | Run completes; upgrade screen opens. |
| Final victory | Not implemented. Game is intended to be endless. |

## 5. Run Duration and Timer

| Parameter | Current Value | Source |
|---|---:|---|
| Base run duration | 60 seconds | `RUN_DURATION_SECONDS` |
| Timer display | `M:SS` countdown | React UI |
| World scroll speed | 1 screen width per 16 seconds | `WORLD_SCROLL_SECONDS_PER_SCREEN` |
| Scroll speed formula | `screenWidth / WORLD_SCROLL_SECONDS_PER_SCREEN` | engine |
| Between-run resurrection phase | yes, on successful run only if units died | engine |
| Between-run upgrade phase | yes, after resurrection or immediately if no units died | engine |
| Difficulty scaling | yes, after successful runs only | `src/config/balance/scaling.ts` |

When the run completes successfully:

- spawning stops;
- active combat/gathering stops because world entities are cleared;
- remaining wolves/resources/death effects are removed from screen;
- dead units are held for optional resurrection;
- living warriors/gatherers and cart are healed;
- resources and purchased upgrades persist;
- run number increments;
- difficulty scaling is applied for the next run;
- resurrection screen opens if any unit died;
- upgrade screen opens immediately if no units died.

## 6. Run-to-Run Difficulty Scaling

Scaling values are defined in `src/config/balance/scaling.ts`.

### Run Number

| Rule | Current Implementation |
|---|---|
| First run | `1` |
| Increment timing | After each successful run |
| Losing | Does not increment and does not apply scaling |
| Display text | `Заезд: X` |
| Display locations | Top gameplay UI, resurrection screen, upgrade screen, scaling summary screen |

### Scaling Timing

Scaling is applied after successful run completion and before the next run begins. The first run uses base values from the resource and wolf config files.

After the player clicks `Следующий заезд` on the upgrade screen, the game shows a scaling summary popup:

| UI Element | Current Text |
|---|---|
| Title | `Мир становится опаснее` |
| Continue button | `Продолжить` |

### Scaling Values

| Scaling Parameter | Current Value | Minimum / Notes | Source |
|---|---:|---|---|
| Resource amount growth | +1 min and +1 max per successful run | no max | `RESOURCE_AMOUNT_GROWTH_PER_SUCCESSFUL_RUN` |
| Wolf pack growth | +1 min and +1 max per successful run | no max | `WOLF_PACK_GROWTH_PER_SUCCESSFUL_RUN` |
| Wolf spawn interval reduction | -0.3 sec per successful run | minimum 2 sec | `WOLF_SPAWN_INTERVAL_REDUCTION_PER_SUCCESSFUL_RUN`, `MIN_WOLF_SPAWN_INTERVAL_SECONDS` |
| Resource spawn interval reduction | -0.2 sec per successful run | minimum 1 sec | `RESOURCE_SPAWN_INTERVAL_REDUCTION_PER_SUCCESSFUL_RUN`, `MIN_RESOURCE_SPAWN_INTERVAL_SECONDS` |
| Wolf stat bonus | +1 to one random wolf stat per successful run | persists permanently | `WOLF_STAT_BONUS_PER_SUCCESSFUL_RUN` |

### Effective Scaling Formulas

```text
completedRuns = successful runs completed

resourceMin = RESOURCE_AMOUNT_MIN + completedRuns * RESOURCE_AMOUNT_GROWTH_PER_SUCCESSFUL_RUN
resourceMax = RESOURCE_AMOUNT_MAX + completedRuns * RESOURCE_AMOUNT_GROWTH_PER_SUCCESSFUL_RUN

wolfPackMin = WOLF_PACK_SIZE_MIN + completedRuns * WOLF_PACK_GROWTH_PER_SUCCESSFUL_RUN
wolfPackMax = WOLF_PACK_SIZE_MAX + completedRuns * WOLF_PACK_GROWTH_PER_SUCCESSFUL_RUN

resourceSpawnInterval = max(
  MIN_RESOURCE_SPAWN_INTERVAL_SECONDS,
  RESOURCE_SPAWN_INTERVAL_SECONDS - completedRuns * RESOURCE_SPAWN_INTERVAL_REDUCTION_PER_SUCCESSFUL_RUN
)

wolfSpawnInterval = max(
  MIN_WOLF_SPAWN_INTERVAL_SECONDS,
  WOLF_PACK_SPAWN_INTERVAL_SECONDS - completedRuns * WOLF_SPAWN_INTERVAL_REDUCTION_PER_SUCCESSFUL_RUN
)
```

### Effective Run Examples

Current base config uses resource amount `1-10` and wolf pack size `3-7`.

| Run | Completed Runs | Resource Amount | Wolf Pack Size | Resource Spawn | Wolf Spawn |
|---:|---:|---:|---:|---:|---:|
| 1 | 0 | 1-10 | 3-7 | 4.0 sec | 6.0 sec |
| 2 | 1 | 2-11 | 4-8 | 3.8 sec | 5.7 sec |
| 3 | 2 | 3-12 | 5-9 | 3.6 sec | 5.4 sec |

### Random Wolf Stat Scaling

Each successful run randomly chooses one wolf stat:

| Choice | Effect |
|---|---|
| Wolf HP | `wolfHpBonus += 1` |
| Wolf Damage | `wolfDamageBonus += 1` |
| Wolf Attack Speed | `wolfAttackSpeedBonus += 1` |

Bonuses persist permanently and stack with prior bonuses.

Effective wolf formulas:

```text
effectiveWolfHp = WOLF_BASE_HP + wolfHpBonus
effectiveWolfDamage = WOLF_DAMAGE + wolfDamageBonus
effectiveWolfAttackSpeed = WOLF_ATTACKS_PER_SECOND + wolfAttackSpeedBonus
```

Scaling summary messages:

| Trigger | Message |
|---|---|
| Wolf pack grows | `🐺 Размер стаи +1` |
| Wolf spawn interval shrinks | `⏱ Волки быстрее появляются` |
| Resource amounts grow | `🌲 Ресурсы стали богаче` |
| Wolf HP chosen | `💀 Волки: Жизни +1` |
| Wolf damage chosen | `💀 Волки: Урон +1` |
| Wolf attack speed chosen | `💀 Волки: Скорость атаки +1` |

## 7. Cart Stats and Upgrades

### Cart Base Stats

| Stat | Current Base Value | Source | Notes |
|---|---:|---|---|
| HP / Max HP | 20 | `CART_BASE_HP` | Cart death at HP <= 0. |
| Armor | 0 | `CART_ARMOR` | Reduces incoming cart damage. |
| Spikes DPS | 0 | `CART_SPIKES_DAMAGE_PER_SECOND` | Damages wolves attacking cart when > 0. |

### Cart Damage Formula

```text
finalDamage = incomingDamage * (1 - armor * 0.1)
```

Current max armor is 4, so current max reduction is 40%.

### Cart Upgrades

| Upgrade ID | Effect | Max | Base Cost |
|---|---|---:|---|
| `cartHp` | Cart max HP +1 | 40 total HP | 2 wood |
| `cartArmor` | Armor +1 | 4 armor | 4 ore |
| `cartSpikes` | Spikes DPS +1 | 5 spikes | 3 wood + 3 ore |

## 8. Warrior Stats and Upgrades

### Starting Warriors

| Parameter | Current Value | Source |
|---|---:|---|
| Starting warriors | 5 | `warriorFormation.length` |

Hired warriors are added to the next run and use generated extra formation slots.

### Warrior Base Stats

| Stat | Current Base Value | Source | Notes |
|---|---:|---|---|
| HP | 7 | `WARRIOR_BASE_HP` | Current code/config value. |
| Damage | 2 | `WARRIOR_DAMAGE` | Damage per attack. |
| Attack speed | 2/sec | `WARRIOR_ATTACKS_PER_SECOND` | Attacks per second while engaged. |
| Regeneration | 0.5 HP/sec | `WARRIOR_REGENERATION_PER_SECOND` | Ticks once per second; increased by upgrade. |
| Run speed multiplier | 4x | `WARRIOR_RUN_SPEED_MULTIPLIER` | Uses world scroll speed as base. |

### Warrior States

| State | Current Meaning |
|---|---|
| `formation` | Cart-relative formation in front of cart. |
| `movingToWolf` | Moving toward assigned wolf. |
| `engaged` | Locked to wolf via world-attached combat anchor. |
| `returning` | Moving back to formation. |
| `dead` | Removed from active unit play; may be resurrected after successful run only. |

### Warrior Upgrades

| Upgrade ID | Effect | Max | Base Cost |
|---|---|---:|---|
| `warriorHp` | Warrior HP +1 | TODO | 4 ore |
| `warriorDamage` | Warrior damage +1 | TODO | 4 ore |
| `warriorAttackSpeed` | Warrior attack speed +1/sec | TODO | 4 ore |
| `warriorRegeneration` | Warrior regeneration +1/sec | TODO | 6 ore |
| `hireWarrior` | Warrior count +1 | TODO | 8 ore |

### Warrior Regeneration Formula

Living warriors regenerate once per second during active runs:

```text
newHp = min(maxHp, currentHp + warriorRegeneration)
```

Dead warriors do not regenerate.

## 9. Gatherer Stats and Upgrades

### Starting Gatherers

| Parameter | Current Value | Source |
|---|---:|---|
| Starting gatherers | 2 | `gathererFormation.length` |

Hired gatherers are added to the next run and use generated extra formation slots.

### Gatherer Base Stats

| Stat | Current Base Value | Source | Notes |
|---|---:|---|---|
| HP | 3 | `GATHERER_BASE_HP` | Current code/config value. |
| Gathering rate | 2/sec | `GATHERER_GATHERING_RATE_PER_SECOND` | Resource units gathered per second per gatherer. |
| Regeneration | 1 HP/sec | `GATHERER_REGENERATION_PER_SECOND` | Ticks once per second; increased by upgrade. |
| Run speed multiplier | 3x | `GATHERER_RUN_SPEED_MULTIPLIER` | Uses world scroll speed as base. |

### Gatherer States

| State | Current Meaning |
|---|---|
| `formation` | Cart-relative formation behind cart. |
| `movingToResource` | Moving toward assigned resource. |
| `gathering` | Gathering assigned resource. |
| `fleeing` | Returning toward formation after wolf targeting/attack. |
| `returning` | Moving back to formation. |
| `dead` | Removed from active unit play; may be resurrected after successful run only. |

### Gatherer Upgrades

| Upgrade ID | Effect | Max | Base Cost |
|---|---|---:|---|
| `gathererGathering` | Gathering rate +1/sec | TODO | 4 wood |
| `gathererHp` | Gatherer HP +1 | TODO | 4 wood |
| `gathererRegeneration` | Gatherer regeneration +1/sec | TODO | 6 wood |
| `hireGatherer` | Gatherer count +1 | TODO | 8 wood |

### Gatherer Regeneration Formula

Living gatherers regenerate once per second during active runs:

```text
newHp = min(maxHp, currentHp + gathererRegeneration)
```

Dead gatherers do not regenerate.

## 10. Resource Spawning and Gathering

### Resources

| Resource | Sprite ID | Adds To | Used For |
|---|---|---|---|
| Wood | `tree` | wood | cart HP, spikes, gatherer upgrades |
| Ore | `ore` | ore | armor, warrior upgrades |

### Resource Spawning

| Parameter | Current Value | Source |
|---|---:|---|
| Base spawn interval | 4 seconds | `RESOURCE_SPAWN_INTERVAL_SECONDS` |
| Effective spawn interval | scales per successful run, minimum 1 second | `scaling.ts` |
| Spawn side | right, offscreen | implementation |
| Spawn X padding | screen width + 48 px | `SPAWN_OFFSCREEN_PADDING` |
| Despawn X | less than -64 px | `DESPAWN_OFFSCREEN_PADDING` |
| Spawn Y min | 112 px | `SPAWN_VERTICAL_TOP_PADDING` |
| Spawn Y max | screen height - 48 px | `SPAWN_VERTICAL_BOTTOM_PADDING` |
| Wood chance | 50% | `WOOD_SPAWN_CHANCE` |
| Ore chance | 50% | derived |
| Base resource amount | random integer 1-10 | `RESOURCE_AMOUNT_MIN/MAX` |
| Effective resource amount | base amount + completed successful runs | `scaling.ts` |

### Gathering Formula

Each gathering gatherer applies gathering every frame:

```text
gatheredThisFrame = min(resource.remainingAmount, gathererGatheringRate * deltaSeconds)
resource.remainingAmount -= gatheredThisFrame
playerResource += gatheredThisFrame
```

Current display floors wood/ore to integers. Multiple gatherers on the same resource each apply their own gathering rate, so total rate is additive.

### Resource Removal

A resource is removed if:

- `remainingAmount <= 0`;
- it scrolls beyond the left despawn boundary.

Gatherers assigned to a removed resource return to formation.

## 11. Wolf Spawning and Combat

### Wolf Pack Spawning

| Parameter | Current Value | Source |
|---|---:|---|
| Base spawn interval | 6 seconds | `WOLF_PACK_SPAWN_INTERVAL_SECONDS` |
| Effective spawn interval | scales per successful run, minimum 2 seconds | `scaling.ts` |
| Spawn side | right, offscreen | implementation |
| Spawn X padding | screen width + 48 px | `SPAWN_OFFSCREEN_PADDING` |
| Spawn Y min | 112 px | `SPAWN_VERTICAL_TOP_PADDING` |
| Spawn Y max | screen height - 48 px | `SPAWN_VERTICAL_BOTTOM_PADDING` |
| Base pack size | random integer 3-7 | `WOLF_PACK_SIZE_MIN/MAX` |
| Effective pack size | base size + completed successful runs | `scaling.ts` |
| Pack layout | 4 columns, 28 px X spacing, 22 px Y spacing | implementation |

### Wolf Base Stats

| Stat | Current Base Value | Source | Notes |
|---|---:|---|---|
| Base HP | 2 | `WOLF_BASE_HP` | Effective HP includes accumulated scaling bonus. |
| Base damage | 1 | `WOLF_DAMAGE` | Effective damage includes accumulated scaling bonus. |
| Base attack speed | 1/sec | `WOLF_ATTACKS_PER_SECOND` | Effective attack speed includes accumulated scaling bonus. |
| Movement speed multiplier | 1x | `WOLF_MOVEMENT_SPEED_MULTIPLIER` | Uses world scroll speed as base. |

### Combat Ranges and Feedback

| Parameter | Current Value | Source |
|---|---:|---|
| Unit arrival distance | 14 px | engine constant |
| Wolf/warrior attack range | 24 px | engine constant |
| Wolf/cart attack range | 34 px | engine constant |
| Cart spikes active distance | 40 px from cart center | engine constant |
| Damage flash duration | 0.14 sec | engine constant |
| Cart hit flash duration | 0.18 sec | engine constant |
| Blood puddle duration | 4 sec fade | `SpawnSystem` |

### Combat Formulas

Warrior attacks wolf:

```text
wolf.hp -= warriorDamage
warriorAttackCooldown = 1 / warriorAttackSpeed
```

Wolf attacks warrior/gatherer/cart:

```text
target.hp -= wolfDamage
wolfAttackCooldown = 1 / wolfAttackSpeed
```

Cart armor applies only to cart damage:

```text
finalCartDamage = wolfDamage * (1 - cartArmor * 0.1)
```

Cart spikes:

```text
if cartSpikes > 0 and wolf is targeting cart and within 40 px:
  wolf.hp -= cartSpikes * deltaSeconds
```

### Targeting

| Behavior | Current Implementation |
|---|---|
| Wolf needs target | Chooses nearest living warrior or gatherer. |
| No living unit target | Targets cart. |
| Wolf targets gatherer | Gatherer stops gathering and flees toward formation/cart. |
| Warrior reaches wolf | Warrior and wolf become locked to a shared world-attached combat anchor. |
| Wolf dies | Blood puddle appears; warrior auto-retargets nearest wolf or returns. |
| Warrior dies | Blood puddle appears; wolf clears target and retargets. |

TODO:
- Exact intended max targeting radius. Current implementation searches all living units.
- Whether wolf despawn should occur if wolves somehow leave the left side. Current implementation focuses on chase/attack behavior.

## 12. Gaze Control

| Parameter | Current Value | Source |
|---|---:|---|
| Origin | cart center | engine |
| Angle | 25 degrees | `GAZE_CONE_ANGLE_DEGREES` |
| Length | screen diagonal * 1.35 | `GAZE_CONE_LENGTH_MULTIPLIER` |
| Direct click fallback radius | 128 px | engine constant |
| Neutral color | gray transparent | engine |
| Gather mode color | blue transparent | engine |
| Attack mode color | red transparent | engine |

### Current Input Rules

| Input | Current Behavior |
|---|---|
| LMB click | Persistent gather mode; select nearest resource in cone or click radius; assign one available gatherer. |
| RMB click | Persistent attack mode; select nearest wolf in cone or click radius; assign one available warrior. |
| `Q` | Recall gatherers; cancels gather mode if active. |
| `W` | Recall warriors; cancels attack mode if active. |
| `E` | Recall all units; returns gaze mode to neutral. |
| RMB context menu | Disabled. |

Available units are units in `formation` or `returning`.

## 13. Post-Run Resurrection Phase

Resurrection definitions are in `src/config/balance/resurrection.ts`.

The resurrection phase happens only after a successful run, and only if at least one warrior or gatherer died during that run. If no units died, the game skips directly to the upgrade screen.

### Resurrection Cost

| Parameter | Current Value | Source |
|---|---:|---|
| Wood cost per resurrected unit | 2 | `RESURRECTION_WOOD_COST` |
| Ore cost per resurrected unit | 2 | `RESURRECTION_ORE_COST` |
| Cost scaling | none | implementation |

### Resurrection Rules

| Rule | Current Implementation |
|---|---|
| Eligible warriors | Only warriors that died during the previous successful run. |
| Eligible gatherers | Only gatherers that died during the previous successful run. |
| Resurrect limit | Cannot resurrect more units than died. |
| Resurrected unit state | Alive, fully healed, formation-ready. |
| Unresurrected dead units | Permanently removed when player continues to upgrade screen. |
| Game over | No resurrection phase after losing. |
| Cannot afford | Button disabled with `Недостаточно ресурсов`. |
| No dead unit of type remains | Button disabled with `Некого воскрешать`. |

### Resurrection Screen UI

| UI Element | Current Text / Value |
|---|---|
| Title | `Воскресите пораженных гномов` |
| Warrior button | `Воскресить воина` |
| Gatherer button | `Воскресить собирателя` |
| Continue button | `Далее` |
| Resource display | current wood and ore |
| Counters | dead warriors, dead gatherers, resurrected warriors, resurrected gatherers |
| Cost display | 2 wood + 2 ore per resurrection |

## 14. Upgrade Costs and Cost Scaling

Upgrade definitions are in `src/config/balance/upgrades.ts`.

After every purchase of a specific upgrade, that upgrade's cost increases by **+1 of each required resource**.

Examples:

| Upgrade | Purchase | Cost |
|---|---:|---|
| Warrior Damage | 1st | 4 ore |
| Warrior Damage | 2nd | 5 ore |
| Warrior Damage | 3rd | 6 ore |
| Cart Spikes | 1st | 3 wood + 3 ore |
| Cart Spikes | 2nd | 4 wood + 4 ore |
| Cart Spikes | 3rd | 5 wood + 5 ore |

Upgrade button disabled reasons:

| Condition | Displayed Reason |
|---|---|
| Not enough resources | `Недостаточно ресурсов` |
| Max value reached | `Максимум` |

## 15. Current Implementation Status

### Implemented

| System | Status |
|---|---|
| Vite + React + TypeScript + PixiJS foundation | Implemented |
| Sprite loading from extracted PNGs | Implemented |
| Pixelated rendering / nearest scaling | Implemented |
| Scrolling grid background | Implemented |
| Cart centered on screen | Implemented |
| Warrior/gatherer formations | Implemented |
| Resource spawning and despawn | Implemented |
| Wolf pack spawning | Implemented |
| Persistent gaze modes | Implemented |
| Cone target detection/highlighting | Implemented |
| Unit assignment | Implemented |
| Resource gathering | Implemented |
| Basic warrior/wolf/cart/gatherer combat | Implemented |
| Blood puddle death effects | Implemented |
| World-attached combat anchors | Implemented |
| Run timer | Implemented |
| Successful run completion transition | Implemented |
| Post-run resurrection screen | Implemented |
| Survivor/cart healing after successful run | Implemented |
| Upgrade screen | Implemented |
| Upgrade purchases and cost scaling | Implemented |
| Hiring extra warriors/gatherers | Implemented |
| Run number display | Implemented |
| Run-to-run difficulty scaling | Implemented |
| Scaling summary screen | Implemented |

### Partially Implemented

| System | Current State |
|---|---|
| Game over | Run phase becomes `gameOver`; dedicated game-over screen/restart UI is not implemented. |
| Regeneration upgrades | Implemented; living warriors/gatherers heal once per second and HP bars show the refill. |
| Spikes | Config/stat/damage hook implemented; starts at 0 and only affects wolves targeting cart within range. |
| Wolf AI | Simple nearest living unit or cart targeting only. |
| Auto-retargeting | Warriors retarget nearest wolf after wolf death; gatherer retargeting is not implemented. |
| Upgrade max values | Cart maxes implemented; warrior/gatherer maxes are TODO. |

### Not Implemented Yet

| System | Notes |
|---|---|
| Dedicated game-over screen | Not implemented. |
| Restart/new-game flow | Not implemented. |
| Save/load | Not implemented. |
| Audio | Not implemented. |
| Complex pathfinding/steering | Not implemented. |
| Tile maps/procedural terrain | Not implemented. |
| Frame animation | Not implemented. |
| More enemy/resource types | Not implemented. |
| Final victory/final boss | Not implemented. |

## 16. Current MVP Scope

Current MVP includes:

- browser-playable PixiJS game scene;
- cart and formation units;
- scrolling world illusion;
- spawning resources and wolves;
- persistent gaze control;
- click assignment;
- gathering;
- basic combat;
- cart death/game-over run phase;
- 60-second run timer;
- successful run completion;
- post-run resurrection screen;
- upgrade screen;
- run-to-run difficulty scaling;
- scaling summary screen;
- upgrade purchasing and next-run start.

Current MVP intentionally does **not** include:

- polished AI;
- dedicated game-over/restart UI;
- final win condition;
- save system;
- audio;
- animation frames.

## 17. Technical Direction for Codex

Current stack:

- Vite
- React
- TypeScript
- PixiJS

Current architecture:

```text
src/
  components/
    ui/
    screens/
  game/
    engine/
    entities/
    rendering/
    systems/
    input/
    state/
  config/
    balance/
  assets/
  types/
  utils/
```

Keep gameplay values in config files when possible. If a value is currently hardcoded in implementation, either move it to config in a future code task or document it as an implementation constant.

## 18. Current Balance Config Files

```text
src/config/balance/cart.ts
src/config/balance/gatherers.ts
src/config/balance/input.ts
src/config/balance/resources.ts
src/config/balance/resurrection.ts
src/config/balance/run.ts
src/config/balance/scaling.ts
src/config/balance/spawn.ts
src/config/balance/upgrades.ts
src/config/balance/warriors.ts
src/config/balance/wolves.ts
```

## 19. Key TODOs / Open Questions

1. What are the max values for warrior/gatherer stat upgrades?
2. What is the maximum number of warriors/gatherers?
3. Should wolves have a finite target acquisition radius?
4. Should wolves despawn if they leave the left side after future AI changes?
5. Should gatherers auto-retarget nearby resources after depletion/despawn?
6. Should unresurrected permanently lost units be represented in any long-term memorial/stat UI?
7. Should a dedicated game-over screen and restart flow be added next?
8. Should scaling summary include exact numeric before/after values?
