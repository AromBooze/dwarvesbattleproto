import {
  Application,
  Container,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";
import {
  GAZE_CONE_ANGLE_DEGREES,
  GAZE_CONE_LENGTH_MULTIPLIER,
} from "../../config/balance/input";
import { WORLD_SCROLL_SECONDS_PER_SCREEN } from "../../config/balance/run";
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
  private warriorSprites: Sprite[] = [];
  private gathererSprites: Sprite[] = [];
  private readonly pointer: PointerState = {
    x: 1,
    y: 0,
  };
  private currentMode: GazeMode = "default";
  private targetsInsideCone = 0;
  private selectedTarget = "none";
  private lastCommandInput: CommandInput = "none";
  private selectedTargetId: string | null = null;
  private scrollOffset = 0;
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
    this.scrollOffset = (this.scrollOffset + scrollSpeed * deltaSeconds) % GRID_SIZE;

    this.drawGrid();
    this.spawnSystem?.update(deltaSeconds, scrollSpeed, {
      width: this.app.screen.width,
      height: this.app.screen.height,
    });
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
    this.warriorSprites = [];
    this.gathererSprites = [];

    const cart = this.createSprite(this.textures.cart, 1);
    this.cartSprite = cart;
    this.spritesLayer.addChild(cart);

    for (const slot of warriorFormation) {
      const warrior = this.createSprite(this.textures[slot.sprite], 1);
      this.warriorSprites.push(warrior);
      this.spritesLayer.addChild(warrior);
    }

    for (const slot of gathererFormation) {
      const gatherer = this.createSprite(this.textures[slot.sprite], 1);
      this.gathererSprites.push(gatherer);
      this.spritesLayer.addChild(gatherer);
    }
  }

  private createSprite(texture: Texture, scale: number) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0.85);
    sprite.scale.set(scale);
    sprite.roundPixels = true;
    return sprite;
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

    this.warriorSprites.forEach((sprite, index) => {
      const slot = warriorFormation[index];
      sprite.position.set(centerX + slot.xOffset, centerY + slot.yOffset);
    });

    this.gathererSprites.forEach((sprite, index) => {
      const slot = gathererFormation[index];
      sprite.position.set(centerX + slot.xOffset, centerY + slot.yOffset);
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
      this.selectNearestTarget("gather");
    }

    if (event.button === 2) {
      event.preventDefault();
      this.currentMode = "attack";
      this.lastCommandInput = "attack-select";
      this.selectNearestTarget("attack");
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
      if (this.currentMode === "gather") {
        this.currentMode = "default";
      }
    }

    if (key === "w") {
      this.lastCommandInput = "cancel-warriors";
      if (this.currentMode === "attack") {
        this.currentMode = "default";
      }
    }

    if (key === "e") {
      this.lastCommandInput = "global-recall";
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

    this.targetsInsideCone = validTargetIds.size;

    for (const resource of resources) {
      this.applyTargetVisual(resource.sprite, validTargetIds.has(resource.id), resource.id, mode);
    }

    for (const wolf of wolves) {
      this.applyTargetVisual(wolf.sprite, validTargetIds.has(wolf.id), wolf.id, mode);
    }
  }

  private selectNearestTarget(mode: GazeMode) {
    const cone = this.getGazeCone();
    const origin = cone.origin;

    if (mode === "gather") {
      const target = this.getResourcesInsideCone(this.spawnSystem?.getResources() ?? [], cone)
        .sort((a, b) => distance(this.getSpritePoint(a.sprite), origin) - distance(this.getSpritePoint(b.sprite), origin))[0];

      this.selectedTargetId = target?.id ?? null;
      this.selectedTarget = target ? `${target.type}:${target.id}` : "none";
      return;
    }

    if (mode === "attack") {
      const target = this.getWolvesInsideCone(this.spawnSystem?.getWolves() ?? [], cone)
        .sort((a, b) => distance(this.getSpritePoint(a.sprite), origin) - distance(this.getSpritePoint(b.sprite), origin))[0];

      this.selectedTargetId = target?.id ?? null;
      this.selectedTarget = target ? `wolf:${target.id}` : "none";
    }
  }

  private getResourcesInsideCone(resources: ResourceEntity[], cone: Cone) {
    return resources.filter((resource) => pointInCone(this.getSpritePoint(resource.sprite), cone));
  }

  private getWolvesInsideCone(wolves: WolfEntity[], cone: Cone) {
    return wolves.filter((wolf) => pointInCone(this.getSpritePoint(wolf.sprite), cone));
  }

  private applyTargetVisual(
    sprite: Sprite,
    isValidTarget: boolean,
    id: string,
    mode: GazeMode,
  ) {
    if (this.selectedTargetId === id) {
      sprite.tint = 0xfff06a;
      sprite.scale.set(1.25);
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
    });
  }
}
