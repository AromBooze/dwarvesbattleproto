import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import {
  CART_ARMOR,
  CART_BASE_HP,
  CART_SPIKES_DAMAGE_PER_SECOND,
} from "../../config/balance/cart";
import {
  GATHERER_BASE_HP,
  GATHERER_GATHERING_RATE_PER_SECOND,
  GATHERER_RUN_SPEED_MULTIPLIER,
} from "../../config/balance/gatherers";
import {
  GAZE_CONE_ANGLE_DEGREES,
  GAZE_CONE_LENGTH_MULTIPLIER,
} from "../../config/balance/input";
import { WORLD_SCROLL_SECONDS_PER_SCREEN } from "../../config/balance/run";
import {
  WARRIOR_ATTACKS_PER_SECOND,
  WARRIOR_BASE_HP,
  WARRIOR_DAMAGE,
  WARRIOR_RUN_SPEED_MULTIPLIER,
} from "../../config/balance/warriors";
import {
  WOLF_ATTACKS_PER_SECOND,
  WOLF_DAMAGE,
  WOLF_MOVEMENT_SPEED_MULTIPLIER,
} from "../../config/balance/wolves";
import { gathererFormation, warriorFormation } from "../entities/formation";
import {
  degreesToRadians,
  distance,
  getConeTriangle,
  normalize,
  pointInCone,
  type Cone,
  type Point,
} from "../input/gazeGeometry";
import {
  type CommandInput,
  type GazeMode,
  type PointerState,
} from "../input/gazeInput";
import { loadSprites } from "../rendering/loadSprites";
import { spriteManifest } from "../rendering/spriteManifest";
import { SpawnSystem } from "../systems/SpawnSystem";
import type { DebugState } from "../state/debugState";
import type { SpriteTextureMap } from "../../types/sprites";
import type { ResourceEntity, WolfEntity } from "../entities/worldEntities";

type DebugListener = (state: DebugState) => void;

const GRID_SIZE = 32;
const UNIT_ARRIVAL_DISTANCE = 14;
const DIRECT_CLICK_TARGET_RADIUS = 128;
const ATTACK_RANGE = 24;
const DAMAGE_FLASH_SECONDS = 0.14;
const CART_HIT_FLASH_SECONDS = 0.18;
const CART_SHAKE_PIXELS = 4;
const WARRIOR_COMBAT_OFFSET: Point = { x: -16, y: 12 };
const WOLF_COMBAT_OFFSET: Point = { x: 16, y: 12 };

type WarriorState = "formation" | "movingToWolf" | "engaged" | "returning" | "dead";
type GathererState = "formation" | "movingToResource" | "gathering" | "fleeing" | "returning" | "dead";

type UnitBase<TState extends string> = {
  id: string;
  sprite: Sprite;
  slotIndex: number;
  state: TState;
  targetId: string | null;
  marker: Text;
  hp: number;
  maxHp: number;
  attackCooldown: number;
  flashUntil: number;
  combatAnchor: Point | null;
};

type WarriorUnit = UnitBase<WarriorState>;
type GathererUnit = UnitBase<GathererState>;

export class BattleCartEngine {
  private readonly app = new Application();
  private readonly stageRoot = new Container();
  private readonly grid = new Graphics();
  private readonly worldLayer = new Container();
  private readonly gazeLayer = new Graphics();
  private readonly spritesLayer = new Container();
  private readonly onDebug: DebugListener;
  private textures: SpriteTextureMap | null = null;
  private spawnSystem: SpawnSystem | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private cartSprite: Sprite | null = null;
  private warriors: WarriorUnit[] = [];
  private gatherers: GathererUnit[] = [];
  private readonly pointer: PointerState = {
    x: 1,
    y: 0,
  };
  private currentMode: GazeMode = "default";
  private targetsInsideCone = 0;
  private selectedTarget = "none";
  private lastCommandInput: CommandInput = "none";
  private lastAssignmentResult = "none";
  private selectedTargetId: string | null = null;
  private wood = 0;
  private ore = 0;
  private cartHp = CART_BASE_HP;
  private cartArmor = CART_ARMOR;
  private cartSpikes = CART_SPIKES_DAMAGE_PER_SECOND;
  private cartFlashUntil = 0;
  private gameOver = false;
  private deadWarriors = 0;
  private deadGatherers = 0;
  private gatheredResource = "none";
  private scrollOffset = 0;
  private elapsedTime = 0;
  private frameCount = 0;
  private fpsElapsed = 0;
  private fps = 0;
  private destroyed = false;

  constructor(
    private readonly host: HTMLElement,
    onDebug: DebugListener,
  ) {
    this.onDebug = onDebug;
  }

  async init() {
    await this.app.init({
      antialias: false,
      autoDensity: true,
      backgroundAlpha: 1,
      backgroundColor: 0x000000,
      resolution: window.devicePixelRatio || 1,
      resizeTo: this.host,
    });

    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }

    this.canvas = this.app.canvas;
    this.host.appendChild(this.canvas);
    this.app.stage.addChild(this.stageRoot);
    this.stageRoot.addChild(this.grid, this.worldLayer, this.gazeLayer, this.spritesLayer);
    this.bindInput();

    this.textures = await loadSprites();
    if (this.destroyed) {
      return;
    }

    this.spawnSystem = new SpawnSystem(this.worldLayer, this.textures);
    this.createStaticScene();
    this.resizeObserver = new ResizeObserver(() => this.layoutScene());
    this.resizeObserver.observe(this.host);
    this.layoutScene();
    this.app.ticker.add(this.tick, this);
  }

  destroy() {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.app.ticker?.remove(this.tick, this);
    this.unbindInput();
    this.spawnSystem?.destroy();
    this.spawnSystem = null;

    if (this.app.renderer) {
      this.app.destroy(true, { children: true });
    }
  }

  private tick() {
    const deltaSeconds = this.app.ticker.deltaMS / 1000;
    const scrollSpeed = this.getScrollSpeed();
    this.elapsedTime += deltaSeconds;
    this.scrollOffset = (this.scrollOffset + scrollSpeed * deltaSeconds) % GRID_SIZE;

    this.drawGrid();
    const spawnResult = this.spawnSystem?.update(deltaSeconds, scrollSpeed, {
      width: this.app.screen.width,
      height: this.app.screen.height,
    });
    this.handleRemovedResources(spawnResult?.removedResourceIds ?? []);
    if (!this.gameOver) {
      this.scrollCombatAnchors(deltaSeconds, scrollSpeed);
      this.updateUnits(deltaSeconds, scrollSpeed);
      this.updateWolves(deltaSeconds, scrollSpeed);
      this.updateCartVisual();
    }
    this.spawnSystem?.updateResourceVisuals();
    this.updateGaze();
    this.updateFps(deltaSeconds);
    this.publishDebug(scrollSpeed);
  }

  private createStaticScene() {
    if (!this.textures) {
      return;
    }

    this.spritesLayer.removeChildren();
    this.cartSprite = null;
    this.warriors = [];
    this.gatherers = [];

    const cart = this.createSprite(this.textures.cart, 1);
    this.cartSprite = cart;
    this.spritesLayer.addChild(cart);

    for (const [index, slot] of warriorFormation.entries()) {
      const warrior = this.createSprite(this.textures[slot.sprite], 1);
      const marker = this.createUnitMarker("бой");
      marker.visible = false;
      this.warriors.push({
        id: `warrior-${index + 1}`,
        sprite: warrior,
        slotIndex: index,
        state: "formation",
        targetId: null,
        marker,
        hp: WARRIOR_BASE_HP,
        maxHp: WARRIOR_BASE_HP,
        attackCooldown: 0,
        flashUntil: 0,
        combatAnchor: null,
      });
      this.spritesLayer.addChild(warrior);
      this.spritesLayer.addChild(marker);
    }

    for (const [index, slot] of gathererFormation.entries()) {
      const gatherer = this.createSprite(this.textures[slot.sprite], 1);
      const marker = this.createUnitMarker("добыча");
      marker.visible = false;
      this.gatherers.push({
        id: `gatherer-${index + 1}`,
        sprite: gatherer,
        slotIndex: index,
        state: "formation",
        targetId: null,
        marker,
        hp: GATHERER_BASE_HP,
        maxHp: GATHERER_BASE_HP,
        attackCooldown: 0,
        flashUntil: 0,
        combatAnchor: null,
      });
      this.spritesLayer.addChild(gatherer);
      this.spritesLayer.addChild(marker);
    }
  }

  private createSprite(texture: Texture, scale: number) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0.85);
    sprite.scale.set(scale);
    sprite.roundPixels = true;
    return sprite;
  }

  private createUnitMarker(text: string) {
    const marker = new Text({
      text,
      style: {
        fill: 0xffffff,
        fontFamily: "Arial, sans-serif",
        fontSize: 12,
        fontWeight: "700",
        stroke: { color: 0x000000, width: 3 },
      },
    });
    marker.anchor.set(0.5, 1);
    return marker;
  }

  private layoutScene() {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    const centerX = Math.round(width * 0.5);
    const centerY = Math.round(height * 0.58);

    this.cartSprite?.position.set(centerX, centerY);

    if (this.pointer.x === 1 && this.pointer.y === 0) {
      this.pointer.x = centerX + 1;
      this.pointer.y = centerY;
    }

    this.warriors.forEach((unit) => {
      const position = this.getWarriorFormationPoint(unit.slotIndex);
      unit.sprite.position.set(position.x, position.y);
      this.updateUnitMarker(unit);
    });

    this.gatherers.forEach((unit) => {
      const position = this.getGathererFormationPoint(unit.slotIndex);
      unit.sprite.position.set(position.x, position.y);
      this.updateUnitMarker(unit);
    });

    this.drawGrid();
  }

  private bindInput() {
    if (!this.canvas) {
      return;
    }

    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.addEventListener("contextmenu", this.preventContextMenu);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("pointerup", this.handleWindowPointerUp);
  }

  private unbindInput() {
    this.canvas?.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas?.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas?.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas?.removeEventListener("pointerleave", this.handlePointerLeave);
    this.canvas?.removeEventListener("contextmenu", this.preventContextMenu);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("pointerup", this.handleWindowPointerUp);
    this.canvas = null;
  }

  private readonly preventContextMenu = (event: Event) => {
    event.preventDefault();
  };

  private readonly handlePointerMove = (event: PointerEvent) => {
    this.updatePointerPosition(event);
  };

  private readonly handlePointerDown = (event: PointerEvent) => {
    this.updatePointerPosition(event);

    if (event.button === 0) {
      this.currentMode = "gather";
      this.lastCommandInput = "gather-select";
      const target = this.selectNearestTarget("gather");
      this.assignGatherer(target);
    }

    if (event.button === 2) {
      event.preventDefault();
      this.currentMode = "attack";
      this.lastCommandInput = "attack-select";
      const target = this.selectNearestTarget("attack");
      this.assignWarrior(target);
    }
  };

  private readonly handlePointerUp = (_event: PointerEvent) => {};

  private readonly handleWindowPointerUp = (event: PointerEvent) => {
    this.handlePointerUp(event);
  };

  private readonly handlePointerLeave = () => {};

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();

    if (key === "q") {
      this.lastCommandInput = "cancel-gather";
      this.recallGatherers();
      if (this.currentMode === "gather") {
        this.currentMode = "default";
      }
    }

    if (key === "w") {
      this.lastCommandInput = "cancel-warriors";
      this.recallWarriors();
      if (this.currentMode === "attack") {
        this.currentMode = "default";
      }
    }

    if (key === "e") {
      this.lastCommandInput = "global-recall";
      this.recallGatherers();
      this.recallWarriors();
      this.currentMode = "default";
    }
  };

  private updatePointerPosition(event: PointerEvent) {
    if (!this.canvas) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.app.screen.width / rect.width;
    const scaleY = this.app.screen.height / rect.height;

    this.pointer.x = (event.clientX - rect.left) * scaleX;
    this.pointer.y = (event.clientY - rect.top) * scaleY;
  }

  private updateGaze() {
    const cone = this.getGazeCone();
    this.drawGazeCone(cone, this.currentMode);
    this.updateTargetHighlights(cone, this.currentMode);
  }

  private getGazeCone(): Cone {
    const origin = this.getCartCenter();
    const direction = normalize({
      x: this.pointer.x - origin.x,
      y: this.pointer.y - origin.y,
    });
    const screenDiagonal = Math.hypot(this.app.screen.width, this.app.screen.height);

    return {
      origin,
      direction,
      angleRadians: degreesToRadians(GAZE_CONE_ANGLE_DEGREES),
      length: screenDiagonal * GAZE_CONE_LENGTH_MULTIPLIER,
    };
  }

  private drawGazeCone(cone: Cone, mode: GazeMode) {
    const [origin, left, right] = getConeTriangle(cone);
    const color = this.getGazeColor(mode);

    this.gazeLayer.clear();
    this.gazeLayer.poly([origin.x, origin.y, left.x, left.y, right.x, right.y]);
    this.gazeLayer.fill({ color, alpha: 0.16 });
    this.gazeLayer.setStrokeStyle({ color, width: 1, alpha: 0.42 });
    this.gazeLayer.stroke();
  }

  private updateTargetHighlights(cone: Cone, mode: GazeMode) {
    const resources = this.spawnSystem?.getResources() ?? [];
    const wolves = this.spawnSystem?.getWolves() ?? [];
    const resourcesInside = mode === "gather" ? this.getResourcesInsideCone(resources, cone) : [];
    const wolvesInside = mode === "attack" ? this.getWolvesInsideCone(wolves, cone) : [];
    const validTargetIds = new Set([
      ...resourcesInside.map((resource) => resource.id),
      ...wolvesInside.map((wolf) => wolf.id),
    ]);
    const assignedTargetIds = this.getAssignedTargetIds();

    this.targetsInsideCone = validTargetIds.size;

    for (const resource of resources) {
      this.applyTargetVisual(
        resource.sprite,
        validTargetIds.has(resource.id),
        assignedTargetIds.has(resource.id),
        resource.id,
        mode,
      );
    }

    for (const wolf of wolves) {
      this.applyTargetVisual(
        wolf.sprite,
        validTargetIds.has(wolf.id),
        assignedTargetIds.has(wolf.id),
        wolf.id,
        mode,
      );
    }
  }

  private selectNearestTarget(mode: GazeMode): ResourceEntity | WolfEntity | null {
    const cone = this.getGazeCone();
    const origin = cone.origin;

    if (mode === "gather") {
      const resources = this.spawnSystem?.getResources() ?? [];
      const target = this.getResourcesInsideCone(resources, cone)
        .sort((a, b) => distance(this.getSpritePoint(a.sprite), origin) - distance(this.getSpritePoint(b.sprite), origin))[0];
      const fallbackTarget = target ?? this.getNearestResourceNearPointer(resources);

      this.selectedTargetId = fallbackTarget?.id ?? null;
      this.selectedTarget = fallbackTarget ? `${fallbackTarget.type}:${fallbackTarget.id}` : "none";
      return fallbackTarget ?? null;
    }

    if (mode === "attack") {
      const wolves = this.spawnSystem?.getWolves() ?? [];
      const target = this.getWolvesInsideCone(wolves, cone)
        .sort((a, b) => distance(this.getSpritePoint(a.sprite), origin) - distance(this.getSpritePoint(b.sprite), origin))[0];
      const fallbackTarget = target ?? this.getNearestWolfNearPointer(wolves);

      this.selectedTargetId = fallbackTarget?.id ?? null;
      this.selectedTarget = fallbackTarget ? `wolf:${fallbackTarget.id}` : "none";
      return fallbackTarget ?? null;
    }

    return null;
  }

  private getResourcesInsideCone(resources: ResourceEntity[], cone: Cone) {
    return resources.filter((resource) => pointInCone(this.getSpritePoint(resource.sprite), cone));
  }

  private getWolvesInsideCone(wolves: WolfEntity[], cone: Cone) {
    return wolves.filter((wolf) => pointInCone(this.getSpritePoint(wolf.sprite), cone));
  }

  private getNearestResourceNearPointer(resources: ResourceEntity[]) {
    return resources
      .filter((resource) => distance(this.getSpritePoint(resource.sprite), this.pointer) <= DIRECT_CLICK_TARGET_RADIUS)
      .sort((a, b) => distance(this.getSpritePoint(a.sprite), this.pointer) - distance(this.getSpritePoint(b.sprite), this.pointer))[0];
  }

  private getNearestWolfNearPointer(wolves: WolfEntity[]) {
    return wolves
      .filter((wolf) => distance(this.getSpritePoint(wolf.sprite), this.pointer) <= DIRECT_CLICK_TARGET_RADIUS)
      .sort((a, b) => distance(this.getSpritePoint(a.sprite), this.pointer) - distance(this.getSpritePoint(b.sprite), this.pointer))[0];
  }

  private assignGatherer(target: ResourceEntity | WolfEntity | null) {
    if (!target || !("type" in target)) {
      this.lastAssignmentResult = "no resource in cone";
      return;
    }

    const gatherer = this.gatherers.find((unit) =>
      unit.hp > 0 && (unit.state === "formation" || unit.state === "returning")
    );

    if (!gatherer) {
      this.lastAssignmentResult = "no gatherer available";
      return;
    }

    gatherer.state = "movingToResource";
    gatherer.targetId = target.id;
    gatherer.combatAnchor = null;
    gatherer.marker.visible = false;
    target.assignedGathererIds.add(gatherer.id);
    this.lastAssignmentResult = `${gatherer.id} -> ${target.type}:${target.id}`;
  }

  private assignWarrior(target: ResourceEntity | WolfEntity | null) {
    if (!target || "type" in target) {
      this.lastAssignmentResult = "no wolf in cone";
      return;
    }

    const warrior = this.warriors.find((unit) =>
      unit.hp > 0 && (unit.state === "formation" || unit.state === "returning")
    );

    if (!warrior) {
      this.lastAssignmentResult = "no warrior available";
      return;
    }

    warrior.state = "movingToWolf";
    warrior.targetId = target.id;
    warrior.combatAnchor = null;
    warrior.marker.visible = false;
    this.lastAssignmentResult = `${warrior.id} -> wolf:${target.id}`;
  }

  private updateUnits(deltaSeconds: number, scrollSpeed: number) {
    const warriorSpeed = scrollSpeed * WARRIOR_RUN_SPEED_MULTIPLIER;
    const gathererSpeed = scrollSpeed * GATHERER_RUN_SPEED_MULTIPLIER;

    for (const warrior of this.warriors) {
      this.updateWarrior(warrior, deltaSeconds, warriorSpeed);
      this.updateUnitMarker(warrior);
    }

    for (const gatherer of this.gatherers) {
      this.updateGatherer(gatherer, deltaSeconds, gathererSpeed);
      this.updateUnitMarker(gatherer);
    }
  }

  private updateWarrior(unit: WarriorUnit, deltaSeconds: number, speed: number) {
    if (unit.state === "dead" || unit.hp <= 0) {
      return;
    }

    unit.attackCooldown = Math.max(0, unit.attackCooldown - deltaSeconds);

    if (unit.state === "formation") {
      this.snapUnitToFormation(unit, this.getWarriorFormationPoint(unit.slotIndex));
      return;
    }

    if (unit.state === "returning") {
      this.moveUnitToFormation(unit, this.getWarriorFormationPoint(unit.slotIndex), deltaSeconds, speed);
      return;
    }

    const target = this.findWolf(unit.targetId);

    if (!target) {
      this.autoRetargetWarrior(unit);
      return;
    }

    const targetPoint = this.getSpritePoint(target.sprite);

    if (unit.state === "movingToWolf") {
      const arrived = this.moveSpriteToward(unit.sprite, targetPoint, deltaSeconds, speed);
      if (arrived) {
        this.startWarriorWolfCombat(unit, target);
      }
    }

    if (unit.state === "engaged") {
      this.positionCombatants(unit, target);
      unit.marker.visible = true;
      this.resolveWarriorAttack(unit, target);
    }
  }

  private updateGatherer(unit: GathererUnit, deltaSeconds: number, speed: number) {
    if (unit.state === "dead" || unit.hp <= 0) {
      return;
    }

    if (unit.state === "formation") {
      this.snapUnitToFormation(unit, this.getGathererFormationPoint(unit.slotIndex));
      return;
    }

    if (unit.state === "returning" || unit.state === "fleeing") {
      this.moveUnitToFormation(unit, this.getGathererFormationPoint(unit.slotIndex), deltaSeconds, speed);
      return;
    }

    const target = this.findResource(unit.targetId);

    if (!target) {
      unit.state = "returning";
      unit.targetId = null;
      unit.marker.visible = false;
      return;
    }

    const targetPoint = this.getSpritePoint(target.sprite);

    if (unit.state === "movingToResource") {
      const arrived = this.moveSpriteToward(unit.sprite, targetPoint, deltaSeconds, speed);
      if (arrived) {
        unit.state = "gathering";
        unit.marker.visible = true;
      }
    }

    if (unit.state === "gathering") {
      const bounce = Math.sin(this.elapsedTime * 12 + unit.slotIndex) * 2;
      unit.sprite.position.set(targetPoint.x - 14, targetPoint.y + 10 + bounce);
      unit.marker.visible = true;
      this.gatherFromResource(unit, target, deltaSeconds);
    }
  }

  private gatherFromResource(unit: GathererUnit, resource: ResourceEntity, deltaSeconds: number) {
    if (resource.remainingAmount <= 0) {
      return;
    }

    const amount = Math.min(
      resource.remainingAmount,
      GATHERER_GATHERING_RATE_PER_SECOND * deltaSeconds,
    );

    resource.remainingAmount -= amount;

    if (resource.type === "wood") {
      this.wood += amount;
    } else {
      this.ore += amount;
    }

    this.gatheredResource = `${resource.type}:${resource.id}`;
    resource.sprite.alpha = 0.78 + Math.sin(this.elapsedTime * 18) * 0.18;

    if (resource.remainingAmount <= 0) {
      this.depleteResource(resource.id);
      unit.state = "returning";
      unit.targetId = null;
      unit.marker.visible = false;
    }
  }

  private updateWolves(deltaSeconds: number, scrollSpeed: number) {
    const wolves = this.spawnSystem?.getWolves() ?? [];
    const wolfSpeed = scrollSpeed * WOLF_MOVEMENT_SPEED_MULTIPLIER;

    for (const wolf of wolves) {
      wolf.attackCooldown = Math.max(0, wolf.attackCooldown - deltaSeconds);
      this.ensureWolfTarget(wolf);
      this.updateWolfVisual(wolf);

      const targetPoint = this.getWolfTargetPoint(wolf);

      if (!targetPoint) {
        continue;
      }

      const range = wolf.targetType === "cart" ? 34 : ATTACK_RANGE;
      const current = this.getSpritePoint(wolf.sprite);
      const targetDistance = distance(current, targetPoint);

      if (wolf.combatAnchor && wolf.targetType === "warrior") {
        const warrior = this.findWarrior(wolf.targetId);

        if (warrior && warrior.state === "engaged") {
          this.positionCombatants(warrior, wolf);
          this.resolveWolfAttack(wolf);
          continue;
        }

        wolf.combatAnchor = null;
      }

      if (targetDistance > range) {
        this.moveSpriteToward(wolf.sprite, targetPoint, deltaSeconds, wolfSpeed);
        continue;
      }

      if (wolf.targetType === "warrior") {
        const warrior = this.findWarrior(wolf.targetId);

        if (warrior) {
          this.startWarriorWolfCombat(warrior, wolf);
        }
      }

      this.resolveWolfAttack(wolf);
    }

    if (this.cartSpikes > 0) {
      this.applyCartSpikes(deltaSeconds);
    }
  }

  private ensureWolfTarget(wolf: WolfEntity) {
    if (this.isWolfTargetValid(wolf)) {
      return;
    }

    const target = this.findNearestLivingUnit(this.getSpritePoint(wolf.sprite));

    if (target) {
      wolf.targetType = target.kind;
      wolf.targetId = target.unit.id;
      wolf.combatAnchor = null;

      if (target.kind === "gatherer" && target.unit.state !== "dead") {
        this.stopGathererTask(target.unit);
        target.unit.state = "fleeing";
      }

      return;
    }

    wolf.targetType = "cart";
    wolf.targetId = "cart";
    wolf.combatAnchor = null;
  }

  private isWolfTargetValid(wolf: WolfEntity) {
    if (wolf.targetType === "cart") {
      return !this.gameOver;
    }

    if (wolf.targetType === "warrior") {
      const warrior = this.findWarrior(wolf.targetId);
      return !!warrior && warrior.hp > 0 && warrior.state !== "dead";
    }

    if (wolf.targetType === "gatherer") {
      const gatherer = this.findGatherer(wolf.targetId);
      return !!gatherer && gatherer.hp > 0 && gatherer.state !== "dead";
    }

    return false;
  }

  private getWolfTargetPoint(wolf: WolfEntity): Point | null {
    if (wolf.targetType === "cart") {
      return this.getCartCenter();
    }

    if (wolf.targetType === "warrior") {
      const warrior = this.findWarrior(wolf.targetId);
      return warrior ? this.getSpritePoint(warrior.sprite) : null;
    }

    if (wolf.targetType === "gatherer") {
      const gatherer = this.findGatherer(wolf.targetId);
      return gatherer ? this.getSpritePoint(gatherer.sprite) : null;
    }

    return null;
  }

  private scrollCombatAnchors(deltaSeconds: number, scrollSpeed: number) {
    const movement = scrollSpeed * deltaSeconds;

    for (const wolf of this.spawnSystem?.getWolves() ?? []) {
      if (wolf.combatAnchor) {
        wolf.combatAnchor.x -= movement;
      }
    }
  }

  private startWarriorWolfCombat(warrior: WarriorUnit, wolf: WolfEntity) {
    if (!wolf.combatAnchor) {
      const warriorPoint = this.getSpritePoint(warrior.sprite);
      const wolfPoint = this.getSpritePoint(wolf.sprite);
      wolf.combatAnchor = {
        x: (warriorPoint.x + wolfPoint.x) / 2,
        y: (warriorPoint.y + wolfPoint.y) / 2,
      };
    }

    warrior.state = "engaged";
    warrior.targetId = wolf.id;
    warrior.combatAnchor = wolf.combatAnchor;
    warrior.marker.visible = true;
    wolf.targetType = "warrior";
    wolf.targetId = warrior.id;
    this.positionCombatants(warrior, wolf);
  }

  private positionCombatants(warrior: WarriorUnit, wolf: WolfEntity) {
    if (!wolf.combatAnchor) {
      return;
    }

    warrior.combatAnchor = wolf.combatAnchor;
    warrior.sprite.position.set(
      wolf.combatAnchor.x + WARRIOR_COMBAT_OFFSET.x,
      wolf.combatAnchor.y + WARRIOR_COMBAT_OFFSET.y,
    );
    wolf.sprite.position.set(
      wolf.combatAnchor.x + WOLF_COMBAT_OFFSET.x,
      wolf.combatAnchor.y + WOLF_COMBAT_OFFSET.y,
    );
  }

  private resolveWarriorAttack(warrior: WarriorUnit, wolf: WolfEntity) {
    if (warrior.attackCooldown > 0 || warrior.hp <= 0) {
      return;
    }

    wolf.hp -= WARRIOR_DAMAGE;
    wolf.flashUntil = this.elapsedTime + DAMAGE_FLASH_SECONDS;
    this.bumpSprite(warrior.sprite, -4);
    warrior.attackCooldown = 1 / WARRIOR_ATTACKS_PER_SECOND;

    if (wolf.hp <= 0) {
      this.killWolf(wolf, warrior);
    }
  }

  private resolveWolfAttack(wolf: WolfEntity) {
    if (wolf.attackCooldown > 0) {
      return;
    }

    this.bumpSprite(wolf.sprite, 4);
    wolf.attackCooldown = 1 / WOLF_ATTACKS_PER_SECOND;

    if (wolf.targetType === "warrior") {
      const warrior = this.findWarrior(wolf.targetId);
      if (warrior) {
        this.damageWarrior(warrior, WOLF_DAMAGE, wolf);
      }
      return;
    }

    if (wolf.targetType === "gatherer") {
      const gatherer = this.findGatherer(wolf.targetId);
      if (gatherer) {
        this.damageGatherer(gatherer, WOLF_DAMAGE, wolf);
      }
      return;
    }

    if (wolf.targetType === "cart") {
      this.damageCart(WOLF_DAMAGE);
    }
  }

  private damageWarrior(warrior: WarriorUnit, damage: number, wolf: WolfEntity) {
    warrior.hp -= damage;
    warrior.flashUntil = this.elapsedTime + DAMAGE_FLASH_SECONDS;

    if (warrior.hp <= 0) {
      this.killWarrior(warrior, wolf);
    }
  }

  private damageGatherer(gatherer: GathererUnit, damage: number, wolf: WolfEntity) {
    this.stopGathererTask(gatherer);
    gatherer.state = "fleeing";
    gatherer.hp -= damage;
    gatherer.flashUntil = this.elapsedTime + DAMAGE_FLASH_SECONDS;

    if (gatherer.hp <= 0) {
      this.killGatherer(gatherer, wolf);
    }
  }

  private damageCart(incomingDamage: number) {
    const finalDamage = incomingDamage * (1 - this.cartArmor * 0.1);
    this.cartHp = Math.max(0, this.cartHp - finalDamage);
    this.cartFlashUntil = this.elapsedTime + CART_HIT_FLASH_SECONDS;

    if (this.cartHp <= 0) {
      this.gameOver = true;
      this.lastAssignmentResult = "game over";
    }
  }

  private killWolf(wolf: WolfEntity, warrior?: WarriorUnit) {
    const deathPoint = wolf.combatAnchor ?? { x: wolf.sprite.x, y: wolf.sprite.y };
    this.spawnSystem?.removeWolf(wolf.id, deathPoint);

    if (this.selectedTargetId === wolf.id) {
      this.selectedTargetId = null;
      this.selectedTarget = "none";
    }

    if (warrior && warrior.hp > 0 && warrior.state !== "dead") {
      warrior.combatAnchor = null;
      this.autoRetargetWarrior(warrior);
    }

    for (const otherWarrior of this.warriors) {
      if (otherWarrior === warrior || otherWarrior.targetId !== wolf.id) {
        continue;
      }

      this.autoRetargetWarrior(otherWarrior);
    }
  }

  private killWarrior(warrior: WarriorUnit, wolf?: WolfEntity) {
    const deathPoint = wolf?.combatAnchor ?? warrior.combatAnchor ?? { x: warrior.sprite.x, y: warrior.sprite.y };
    warrior.state = "dead";
    warrior.targetId = null;
    warrior.combatAnchor = null;
    warrior.marker.visible = false;
    warrior.sprite.visible = false;
    warrior.sprite.tint = 0xffffff;
    warrior.sprite.scale.set(1);
    this.spawnSystem?.addDeathEffect(deathPoint);
    this.deadWarriors += 1;

    if (wolf) {
      wolf.targetId = null;
      wolf.targetType = null;
      wolf.combatAnchor = null;
    }
  }

  private killGatherer(gatherer: GathererUnit, wolf?: WolfEntity) {
    const deathPoint = { x: gatherer.sprite.x, y: gatherer.sprite.y };
    this.stopGathererTask(gatherer);
    gatherer.state = "dead";
    gatherer.targetId = null;
    gatherer.combatAnchor = null;
    gatherer.marker.visible = false;
    gatherer.sprite.visible = false;
    gatherer.sprite.tint = 0xffffff;
    gatherer.sprite.scale.set(1);
    this.spawnSystem?.addDeathEffect(deathPoint);
    this.deadGatherers += 1;

    if (wolf) {
      wolf.targetId = null;
      wolf.targetType = null;
      wolf.combatAnchor = null;
    }
  }

  private autoRetargetWarrior(warrior: WarriorUnit) {
    const target = this.findNearestWolf(this.getSpritePoint(warrior.sprite));

    if (!target) {
      warrior.state = "returning";
      warrior.targetId = null;
      warrior.marker.visible = false;
      return;
    }

    warrior.state = "movingToWolf";
    warrior.targetId = target.id;
    warrior.combatAnchor = null;
    warrior.marker.visible = false;
    target.targetType = "warrior";
    target.targetId = warrior.id;
    target.combatAnchor = null;
  }

  private stopGathererTask(gatherer: GathererUnit) {
    if (gatherer.targetId) {
      this.findResource(gatherer.targetId)?.assignedGathererIds.delete(gatherer.id);
    }

    gatherer.targetId = null;
    gatherer.marker.visible = false;
  }

  private findNearestLivingUnit(origin: Point) {
    const livingWarriors = this.warriors
      .filter((unit) => unit.hp > 0 && unit.state !== "dead")
      .map((unit) => ({ kind: "warrior" as const, unit, distance: distance(origin, this.getSpritePoint(unit.sprite)) }));
    const livingGatherers = this.gatherers
      .filter((unit) => unit.hp > 0 && unit.state !== "dead")
      .map((unit) => ({ kind: "gatherer" as const, unit, distance: distance(origin, this.getSpritePoint(unit.sprite)) }));

    return [...livingWarriors, ...livingGatherers].sort((a, b) => a.distance - b.distance)[0];
  }

  private findNearestWolf(origin: Point) {
    return (this.spawnSystem?.getWolves() ?? [])
      .sort((a, b) => distance(origin, this.getSpritePoint(a.sprite)) - distance(origin, this.getSpritePoint(b.sprite)))[0];
  }

  private applyCartSpikes(deltaSeconds: number) {
    const wolves = this.spawnSystem?.getWolves() ?? [];

    for (const wolf of wolves) {
      if (wolf.targetType !== "cart") {
        continue;
      }

      if (distance(this.getSpritePoint(wolf.sprite), this.getCartCenter()) > 40) {
        continue;
      }

      wolf.hp -= this.cartSpikes * deltaSeconds;
      wolf.flashUntil = this.elapsedTime + DAMAGE_FLASH_SECONDS;

      if (wolf.hp <= 0) {
        this.killWolf(wolf);
      }
    }
  }

  private depleteResource(resourceId: string) {
    const resource = this.findResource(resourceId);

    if (!resource) {
      return;
    }

    this.returnGatherersAssignedTo(resourceId);
    this.spawnSystem?.removeResource(resourceId);
    this.lastAssignmentResult = `${resource.type}:${resource.id} depleted`;

    if (this.selectedTargetId === resourceId) {
      this.selectedTargetId = null;
      this.selectedTarget = "none";
    }
  }

  private recallGatherers() {
    for (const gatherer of this.gatherers) {
      if (gatherer.targetId) {
        this.findResource(gatherer.targetId)?.assignedGathererIds.delete(gatherer.id);
      }
      gatherer.state = "returning";
      gatherer.targetId = null;
      gatherer.combatAnchor = null;
      gatherer.marker.visible = false;
    }
    this.lastAssignmentResult = "gatherers recalled";
  }

  private recallWarriors() {
    for (const warrior of this.warriors) {
      warrior.state = "returning";
      warrior.targetId = null;
      warrior.combatAnchor = null;
      warrior.marker.visible = false;
    }

    for (const wolf of this.spawnSystem?.getWolves() ?? []) {
      if (wolf.targetType === "warrior") {
        wolf.targetId = null;
        wolf.targetType = null;
        wolf.combatAnchor = null;
      }
    }

    this.lastAssignmentResult = "warriors recalled";
  }

  private handleRemovedResources(resourceIds: string[]) {
    for (const resourceId of resourceIds) {
      this.returnGatherersAssignedTo(resourceId);

      if (this.selectedTargetId === resourceId) {
        this.selectedTargetId = null;
        this.selectedTarget = "none";
      }

      if (this.gatheredResource.includes(resourceId)) {
        this.gatheredResource = "none";
      }
    }
  }

  private returnGatherersAssignedTo(resourceId: string) {
    for (const gatherer of this.gatherers) {
      if (gatherer.targetId !== resourceId) {
        continue;
      }

      gatherer.state = "returning";
      gatherer.targetId = null;
      gatherer.marker.visible = false;
    }
  }

  private moveUnitToFormation<TState extends string>(
    unit: UnitBase<TState>,
    destination: Point,
    deltaSeconds: number,
    speed: number,
  ) {
    const arrived = this.moveSpriteToward(unit.sprite, destination, deltaSeconds, speed);

    if (arrived) {
      unit.sprite.position.set(destination.x, destination.y);
      unit.state = "formation" as TState;
      unit.combatAnchor = null;
      unit.marker.visible = false;
    }
  }

  private snapUnitToFormation<TState extends string>(unit: UnitBase<TState>, position: Point) {
    unit.sprite.position.set(position.x, position.y);
    unit.combatAnchor = null;
    unit.marker.visible = false;
  }

  private moveSpriteToward(sprite: Sprite, destination: Point, deltaSeconds: number, speed: number) {
    const current = this.getSpritePoint(sprite);
    const remainingDistance = distance(current, destination);

    if (remainingDistance <= UNIT_ARRIVAL_DISTANCE) {
      return true;
    }

    const step = Math.min(remainingDistance, speed * deltaSeconds);
    const direction = normalize({
      x: destination.x - current.x,
      y: destination.y - current.y,
    });

    sprite.x += direction.x * step;
    sprite.y += direction.y * step;
    return remainingDistance - step <= UNIT_ARRIVAL_DISTANCE;
  }

  private findResource(id: string | null) {
    return (this.spawnSystem?.getResources() ?? []).find((resource) => resource.id === id);
  }

  private findWolf(id: string | null) {
    return (this.spawnSystem?.getWolves() ?? []).find((wolf) => wolf.id === id);
  }

  private findWarrior(id: string | null) {
    return this.warriors.find((warrior) => warrior.id === id);
  }

  private findGatherer(id: string | null) {
    return this.gatherers.find((gatherer) => gatherer.id === id);
  }

  private getAssignedTargetIds() {
    return new Set([
      ...this.gatherers.flatMap((unit) => unit.targetId ? [unit.targetId] : []),
      ...this.warriors.flatMap((unit) => unit.targetId ? [unit.targetId] : []),
    ]);
  }

  private getWarriorFormationPoint(index: number): Point {
    const slot = warriorFormation[index];
    const cart = this.getCartFormationCenter();

    return {
      x: cart.x + slot.xOffset,
      y: cart.y + slot.yOffset,
    };
  }

  private getGathererFormationPoint(index: number): Point {
    const slot = gathererFormation[index];
    const cart = this.getCartFormationCenter();

    return {
      x: cart.x + slot.xOffset,
      y: cart.y + slot.yOffset,
    };
  }

  private getCartFormationCenter(): Point {
    return {
      x: Math.round(this.app.screen.width * 0.5),
      y: Math.round(this.app.screen.height * 0.58),
    };
  }

  private updateUnitMarker<TState extends string>(unit: UnitBase<TState>) {
    unit.marker.position.set(unit.sprite.x, unit.sprite.y - unit.sprite.height - 4);
    if (unit.state === "dead") {
      unit.sprite.tint = 0xffffff;
      unit.marker.visible = false;
      return;
    }

    if (unit.flashUntil > this.elapsedTime) {
      unit.sprite.tint = 0xff6464;
      return;
    }

    unit.sprite.tint = unit.state === "formation" ? 0xffffff : 0xfff06a;
  }

  private updateWolfVisual(wolf: WolfEntity) {
    wolf.sprite.tint = wolf.flashUntil > this.elapsedTime ? 0xff6464 : 0xffffff;
  }

  private updateCartVisual() {
    if (!this.cartSprite) {
      return;
    }

    const formation = this.getCartFormationCenter();

    if (this.cartFlashUntil > this.elapsedTime) {
      const shake = Math.sin(this.elapsedTime * 80) * CART_SHAKE_PIXELS;
      this.cartSprite.position.set(formation.x + shake, formation.y);
      this.cartSprite.tint = 0xff7777;
      return;
    }

    this.cartSprite.position.set(formation.x, formation.y);
    this.cartSprite.tint = 0xffffff;
  }

  private bumpSprite(sprite: Sprite, _xOffset: number) {
    sprite.scale.set(1.12);
  }

  private applyTargetVisual(
    sprite: Sprite,
    isValidTarget: boolean,
    isAssignedTarget: boolean,
    id: string,
    mode: GazeMode,
  ) {
    if (this.selectedTargetId === id) {
      sprite.tint = 0xfff06a;
      sprite.scale.set(1.25);
      return;
    }

    if (isAssignedTarget) {
      sprite.tint = 0x9dff7a;
      sprite.scale.set(1.18);
      return;
    }

    if (isValidTarget) {
      sprite.tint = mode === "attack" ? 0xff7878 : 0x7dc7ff;
      sprite.scale.set(1.15);
      return;
    }

    sprite.tint = 0xffffff;
    sprite.scale.set(1);
  }

  private getCartCenter(): Point {
    if (!this.cartSprite) {
      return {
        x: this.app.screen.width * 0.5,
        y: this.app.screen.height * 0.58,
      };
    }

    return {
      x: this.cartSprite.x,
      y: this.cartSprite.y - this.cartSprite.height * 0.35,
    };
  }

  private getSpritePoint(sprite: Sprite): Point {
    return {
      x: sprite.x,
      y: sprite.y - sprite.height * 0.35,
    };
  }

  private getGazeColor(mode: GazeMode) {
    if (mode === "gather") {
      return 0x2c8dff;
    }

    if (mode === "attack") {
      return 0xff3b3b;
    }

    return 0xb7b7b7;
  }

  private drawGrid() {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    const xOffset = -this.scrollOffset;

    this.grid.clear();
    this.grid.setStrokeStyle({ width: 1, color: 0x3c3c3c, alpha: 0.34 });

    for (let x = xOffset; x <= width + GRID_SIZE; x += GRID_SIZE) {
      this.grid.moveTo(Math.round(x), 0);
      this.grid.lineTo(Math.round(x), height);
    }

    for (let y = 0; y <= height + GRID_SIZE; y += GRID_SIZE) {
      this.grid.moveTo(0, Math.round(y));
      this.grid.lineTo(width, Math.round(y));
    }

    this.grid.stroke();
  }

  private getScrollSpeed() {
    return this.app.screen.width / WORLD_SCROLL_SECONDS_PER_SCREEN;
  }

  private updateFps(deltaSeconds: number) {
    this.frameCount += 1;
    this.fpsElapsed += deltaSeconds;

    if (this.fpsElapsed >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsElapsed);
      this.frameCount = 0;
      this.fpsElapsed = 0;
    }
  }

  private publishDebug(scrollSpeed: number) {
    const spawnDebug = this.spawnSystem?.getDebugState();
    const availableWarriors = this.warriors.filter((unit) =>
      unit.hp > 0 && (unit.state === "formation" || unit.state === "returning")
    ).length;
    const availableGatherers = this.gatherers.filter((unit) =>
      unit.hp > 0 && (unit.state === "formation" || unit.state === "returning")
    ).length;
    const activeGatherers = this.gatherers.filter((unit) => unit.state === "gathering").length;
    const livingWarriors = this.warriors.filter((unit) => unit.hp > 0 && unit.state !== "dead").length;
    const livingGatherers = this.gatherers.filter((unit) => unit.hp > 0 && unit.state !== "dead").length;
    const wolves = this.spawnSystem?.getWolves() ?? [];
    const activeCombats = this.warriors.filter((unit) => unit.state === "engaged").length;
    const wolvesTargetingCart = wolves.filter((wolf) => wolf.targetType === "cart").length;
    const assignedWarriors = this.warriors.filter((unit) =>
      unit.hp > 0 && unit.state !== "formation" && unit.state !== "returning"
    ).length;
    const assignedGatherers = this.gatherers.filter((unit) =>
      unit.hp > 0 && unit.state !== "formation" && unit.state !== "returning"
    ).length;

    this.onDebug({
      fps: this.fps,
      width: Math.round(this.app.screen.width),
      height: Math.round(this.app.screen.height),
      scrollSpeed: Math.round(scrollSpeed),
      loadedSprites: this.textures ? spriteManifest.length : 0,
      activeResources: spawnDebug?.activeResources ?? 0,
      activeWolves: spawnDebug?.activeWolves ?? 0,
      nextResourceSpawn: spawnDebug?.nextResourceSpawn ?? 0,
      nextWolfSpawn: spawnDebug?.nextWolfSpawn ?? 0,
      gazeMode: this.currentMode,
      targetsInsideCone: this.targetsInsideCone,
      selectedTarget: this.selectedTarget,
      lastCommandInput: this.lastCommandInput,
      wood: Math.floor(this.wood),
      ore: Math.floor(this.ore),
      cartHp: Math.ceil(this.cartHp),
      cartMaxHp: CART_BASE_HP,
      livingWarriors,
      totalWarriors: this.warriors.length,
      livingGatherers,
      totalGatherers: this.gatherers.length,
      availableWarriors,
      assignedWarriors,
      availableGatherers,
      assignedGatherers,
      lastAssignmentResult: this.lastAssignmentResult,
      activeGatherers,
      gatheredResource: activeGatherers > 0 ? this.gatheredResource : "none",
      activeCombats,
      wolvesTargetingCart,
      deadWarriors: this.deadWarriors,
      deadGatherers: this.deadGatherers,
      gameOver: this.gameOver,
    });
  }
}
