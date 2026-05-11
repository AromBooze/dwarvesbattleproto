# Battle Cart Prototype — Codex-Friendly GDD

## 1. High Concept

A 2D real-time escort/defense prototype.

The player protects a cart moving through a dangerous road. The cart visually stays near the center of the screen while the background, resources, and enemies move from right to left.

The player commands two groups using a directional “gaze cone” from the cart:

- **Warriors** attack wolves.
- **Gatherers** collect wood and ore.

Between runs, the player spends resources on upgrades.

## 2. Prototype Visual Direction

- 2D game.
- All game entities are static sprites.
- No frame-by-frame character animation required for MVP.
- Use simple effects instead:
  - attack: sprite jumps slightly / bumps toward target;
  - taking damage: brief flash/shake;
  - death: sprite replaced with blood puddle;
  - gathering: simple progress bar or small hit effect;
  - cart damage: shake/flash.

MVP visuals can use placeholder sprites or simple shapes first.

## Visual Assets / Sprite Mapping

The project already contains a sprite atlas and extracted sprites for the current prototype art style.

Source files:
- `Sprites/battle_cart_sprite_atlas.png`
- `Sprites/battle_cart_sprite_atlas.json`
- `Sprites/battle_cart_sprite_atlas_README.md`

Codex should prefer atlas rendering with `Sprites/battle_cart_sprite_atlas.png` and `Sprites/battle_cart_sprite_atlas.json`, but may use extracted PNG files if simpler during prototype implementation.

| Gameplay Object | Sprite ID | File | Notes |
|---|---|---|---|
| Cart | `cart` | `Sprites/individual_sprites/cart.png` | Main cart object. Use larger scale (~4 unit sprites). Keep centered on screen. |
| Warrior | `warrior` | `Sprites/individual_sprites/warrior.png` | Dwarf warrior with helmet and sword. Formation in front of cart. |
| Gatherer | `gatherer` | `Sprites/individual_sprites/gatherer.png` | Dwarf gatherer with pickaxe. Formation behind cart. |
| Ore Resource | `ore` | `Sprites/individual_sprites/ore.png` | Resource node. |
| Tree Resource | `tree` | `Sprites/individual_sprites/tree.png` | Resource node. |
| Wolf | `wolf` | `Sprites/individual_sprites/wolf.png` | Generic wolf enemy. |
| Death Effect | `blood_puddle` | `Sprites/individual_sprites/blood_puddle.png` | Replace dead warrior/gatherer/wolf sprite with blood puddle. |

### Rendering Rules

- Cart visually stays near screen center.
- Units move relative to cart.
- Resources and wolves scroll right-to-left.
- Use pixelated rendering: `image-rendering: pixelated`.
- Use nearest-neighbor scaling.

### Sprite Sizes

Recommended default:
- units/resources/wolf: ~32x32
- cart: ~128x64

Keep proportions visually readable.

### Animation Philosophy

Do NOT implement frame animation.

Use simple sprite effects:
- attack: quick hop/bump
- damage: flash/shake
- death: replace with blood puddle
- gathering: tiny bounce or hit effect

### Placeholder Environment

Environment may remain:
- black background
- scrolling grid
- enough motion to communicate cart speed

Current art style target:
"Simple NES-inspired pixel art"

## 3. Core Gameplay Loop

1. Run starts.
2. Cart moves forward automatically.
3. Resources and wolf packs spawn from the right side.
4. Player commands gatherers and warriors using gaze direction.
5. Player survives until run timer ends.
6. Dead warriors/gatherers are restored.
7. Cart and units are fully healed.
8. Player spends wood/ore on upgrades.
9. Player starts the next run.
10. Difficulty increases before each next run.

## 4. Win / Lose Conditions

### Lose
The player loses if cart HP reaches 0 or below.

### Run Complete
A run ends successfully when the run timer reaches 0.

### Game Victory
There is no final victory condition.

The game is endless and continues until the player loses.

## 5. Run Settings

| Parameter | Value |
|---|---:|
| Base run duration | 90 seconds |
| Cart/world scroll speed | 1 screen width per 16 seconds |
| First run difficulty scaling | none |
| Between-run upgrade phase | yes |

## 6. Cart

The cart is the central object the player protects. The cart visually stays near the center of the screen.

### Cart Base Stats

| Stat | Base Value | Notes |
|---|---:|---|
| HP | 20 | Lose if HP <= 0 |
| Armor | 0 | Each armor point reduces incoming damage by 10% |
| Spikes | 0 | Deals damage per second to each wolf attacking the cart |
| World scroll speed | 1 screen / 16 sec | Background/resources/enemies move right-to-left |

### Cart Damage Formula

```text
finalDamage = incomingDamage * (1 - armor * 0.1)
```

TBD:
- Should armor allow damage to reach 0 at armor 10?
- Current max armor is 4, so max reduction is 40%.

## 7. Warriors

Warriors walk in formation in front of the cart by default. When commanded, they sprint toward a target wolf and fight until one side dies.

### Starting Warriors

| Parameter | Value |
|---|---:|
| Starting warriors | 5 |

### Warrior Base Stats

| Stat | Base Value | Notes |
|---|---:|---|
| Damage | 2 | Damage per attack |
| Attack speed | 2/sec | Attacks per second while fighting |
| HP | 5 | Damage needed to kill warrior |
| Regeneration | 1/sec | Restores HP up to max HP |
| Run speed multiplier | 4x | Applied while executing command / returning |

### Warrior Behavior

Default state:
- stays in formation in front of cart;
- moves with cart/world speed visually.

Commanded state:
- moves toward assigned wolf at boosted speed;
- attacks wolf when close enough;
- continues combat until warrior or wolf dies.

After target dies:
- if valid wolf targets exist, warrior automatically retargets;
- if no valid wolf targets exist, warrior returns to formation.

New player commands always override the previous warrior task.

TBD:
- Exact “nearby wolf” search radius.

## 8. Gatherers

Gatherers walk in formation behind the cart by default. When commanded, they sprint toward a resource node and collect it.

### Starting Gatherers

| Parameter | Value |
|---|---:|
| Starting gatherers | 2 |

### Gatherer Base Stats

| Stat | Base Value | Notes |
|---|---:|---|
| Gathering | 2/sec | Resource units gathered per second |
| HP | 3 | Damage needed to kill gatherer |
| Regeneration | 1/sec | Restores HP up to max HP |
| Run speed multiplier | 3x | Applied while executing command / returning |

### Gatherer Behavior

Default state:
- stays in formation behind cart.

Commanded state:
- moves toward assigned resource at boosted speed;
- gathers until resource is depleted or disappears;
- collected resource is added to player pool over time;
- if target resource leaves screen, gatherer searches for a new valid resource target;
- if no valid resource target exists, gatherer returns to formation.

New player commands always override the previous gatherer task.

If attacked:
- gatherer tries to flee back to the cart;
- wolves may continue attacking based on targeting logic.

TBD:
- Can gatherers be killed while fleeing?
- Can warriors intercept wolves attacking a gatherer automatically?

## 9. Resources

Two resource types exist:

| Resource | Icon Suggestion | Used For |
|---|---|---|
| Wood | 🪵 | cart HP, spikes, gatherer upgrades |
| Ore | ⛓️ | armor, warrior upgrades |

Resources are attached to the scrolling world and move from right to left.

### Resource Spawning

| Parameter | Value |
|---|---:|
| Base spawn interval | 4 sec |
| Spawn side | right, offscreen |
| Spawn vertical position | random |
| Wood chance | 50% |
| Ore chance | 50% |
| Resource amount | random 1–10 |

### Resource Despawn

A resource is destroyed if:
- it is depleted;
- it leaves the left side of the screen.

If a gatherer was gathering a resource that despawns:
- gatherer returns to formation.

## 10. Wolves

Wolves spawn in packs from the right side and attack the nearest valid target.

### Wolf Pack Spawning

| Parameter | Value |
|---|---:|
| Base spawn interval | 6 sec |
| Spawn side | right, offscreen |
| Spawn vertical position | random |
| Base pack size | random 3–14 |

### Wolf Base Stats

| Stat | Base Value | Notes |
|---|---:|---|
| HP | 2 | Can scale between runs |
| Damage | 1 | Damage per attack |
| Attack speed | 1/sec | Attacks per second |
| Movement speed | Warrior commanded speed * 0.5 | Based on warrior sprint speed |

### Wolf Target Priority

1. Nearest warriors or gatherers.
2. Cart, if no units block/attract them.

### Wolf Combat Behavior

- Wolves move toward target.
- When close enough, wolves stop moving relative to target and attack.
- If target dies, wolf chooses next target by priority.
- If attacking the cart, spikes deal damage per second to each attacking wolf.

TBD:
- Whether wolf pack acts as individual wolves or shared group AI.
- Exact target detection radius.
- Exact attack range.

## 11. Gaze Control

The player commands units using a gaze cone from the cart.

### Gaze Shape

| Parameter | Value |
|---|---:|
| Origin | cart center |
| Base angle | 25 degrees |
| Direction | cart center toward mouse cursor |
| Default color | gray, transparent |
| Gatherer command color | blue |
| Warrior command color | red |

The gaze cone is visually represented as a triangle/cone.

### Gatherer Command

Input:
- Hold/press LMB to activate blue gaze.
- Click LMB on valid resource inside gaze.

Behavior:
- nearest valid resource inside gaze is selected;
- one available gatherer is sent to gather it;
- repeated clicks send additional gatherers.

Cancel:
- `Q` cancels gatherer commands;
- gatherers return to cart formation.

### Warrior Command

Input:
- Hold/press RMB to activate red gaze.
- Click RMB on valid wolf inside gaze.

Behavior:
- nearest valid wolf inside gaze is selected;
- one available warrior is sent to fight it;
- repeated clicks send additional warriors.

Cancel:
- `W` cancels warrior commands;
- warriors return to cart formation.

### Global Recall

Input:
- `E`

Behavior:
- all warriors and gatherers stop current tasks;
- all return to cart formation.

### Invalid Command Rule

If no valid target exists inside gaze:
- command does nothing.

## 12. Between-Run Upgrade Phase

When a run ends successfully:

1. All killed warriors and gatherers are restored.
2. All warriors, gatherers, and cart are healed to maximum HP.
3. Upgrade menu opens.
4. Player can spend wood/ore.
5. Player starts next run.

Upgrades persist until game over / new game.

## 13. Upgrade Balance

### Cart Upgrades

| Upgrade | Effect | Max | Cost |
|---|---:|---:|---|
| Cart HP | +1 HP | 40 total HP | 2 wood |
| Cart Armor | +1 armor | 4 armor | 4 ore |
| Cart Spikes | +1 spikes DPS | 5 spikes | 3 wood + 3 ore |

### Warrior Upgrades

| Upgrade | Effect | Max | Cost |
|---|---:|---:|---|
| Warrior HP | +1 HP | TBD | 4 ore |
| Warrior Damage | +1 damage | TBD | 4 ore |
| Warrior Attack Speed | +1 attack/sec | TBD | 4 ore |
| Warrior Regeneration | +1 regen/sec | TBD | 6 ore |
| Hire Warrior | +1 warrior | TBD | 8 ore |

### Gatherer Upgrades

| Upgrade | Effect | Max | Cost |
|---|---:|---:|---|
| Gatherer Gathering | +1 gather/sec | TBD | 4 wood |
| Gatherer HP | +1 HP | TBD | 4 wood |
| Gatherer Regeneration | +1 regen/sec | TBD | 6 wood |
| Hire Gatherer | +1 gatherer | TBD | 8 wood |

### Upgrade Cost Scaling

After every purchase of a specific upgrade, that upgrade's cost increases by **+1 unit of each required resource**.

Examples:
- Warrior Damage starts at 4 ore.
  - first purchase: 4 ore
  - second purchase: 5 ore
  - third purchase: 6 ore

- Cart Spikes starts at 3 wood + 3 ore.
  - first purchase: 3 wood + 3 ore
  - second purchase: 4 wood + 4 ore
  - third purchase: 5 wood + 5 ore

TBD:
- Max values for warrior/gatherer stats.

## 14. Endless Run Rules

- The game is endless.
- There is no final victory screen.
- The player continues starting new runs until the cart is destroyed.
- Run number should be tracked and displayed.
- Difficulty scaling applies before every next run except the first.

## 15. Next Run Difficulty Scaling

Before each next run, except the first run, apply difficulty increases.

### Scaling Rules

| System | Rule |
|---|---|
| Wolf pack size | min and max +1 |
| Resource amount | min and max +1 |
| Wolf spawn interval | -0.3 sec per run, minimum 2 sec |
| Resource spawn interval | -0.2 sec per run, minimum 1 sec |
| Wolf stat scaling | Randomly choose one: wolf HP +1, wolf damage +1, or wolf attack speed +1 |

TBD:
- Should resource scaling be a reward/comeback mechanic or difficulty pacing?
- Should the random wolf stat scaling be displayed to the player?

## 16. UI Screens

### Main Run Screen

Must show:
- cart in center;
- warriors in front formation;
- gatherers behind formation;
- resources moving right-to-left;
- wolves moving/attacking;
- gaze cone from cart to mouse;
- top resource panel;
- run timer;
- cart HP;
- unit counts.

### Upgrade Screen

Must show:
- available upgrades;
- current stats;
- upgrade effect;
- cost;
- current resources;
- “Следующий заезд” button.

### Game Over Screen

Must show:
- defeat message;
- restart button;
- run reached;
- resources collected if available.

## 17. MVP Implementation Scope

### Must Have

- Vite + React + TypeScript.
- 2D game surface using canvas or DOM sprites.
- Cart centered on screen.
- Scrolling background illusion.
- Spawn resources.
- Spawn wolf packs.
- Warriors and gatherers as simple sprites.
- Gaze cone control.
- Assign warriors to wolves.
- Assign gatherers to resources.
- Basic combat.
- Basic gathering.
- Cart damage and death.
- Run timer.
- Upgrade screen.
- Difficulty scaling between runs.

### Nice To Have Later

- Better sprite art.
- Audio.
- Screen shake polish.
- Better AI steering.
- Smooth formation behavior.
- Improved hit effects.
- More enemy types.
- More resource types.
- Final boss / final run.

### Do Not Implement Yet

- Complex pathfinding.
- Tile maps.
- Save system.
- Multiplayer.
- Inventory.
- Procedural terrain.
- Complex animations.

## 18. Technical Direction for Codex

Recommended stack:
- Vite
- React
- TypeScript
- HTML Canvas

Suggested architecture:

```text
src/
  components/
    ui/
    screens/
  game/
    loop/
    systems/
    entities/
    input/
    rendering/
  config/
    balance/
  types/
  utils/
```

Keep gameplay values in config files.

Separate:
- rendering;
- simulation;
- input;
- balance;
- UI screens.

## 19. Balance Config Files

Suggested config split:

```text
src/config/balance/cart.json
src/config/balance/warriors.json
src/config/balance/gatherers.json
src/config/balance/wolves.json
src/config/balance/resources.json
src/config/balance/upgrades.json
src/config/balance/runs.json
src/config/balance/input.json
```

## 20. Key Open Questions

1. What are the max values for warrior/gatherer upgrades?
2. Should dead units be restored only after successful runs, or also after losing?
3. Should cart HP persist between runs before healing, or always full-heal as currently stated?
4. What are exact auto-retarget search radii for warriors and gatherers?
5. Should there be a maximum number of warriors/gatherers?
