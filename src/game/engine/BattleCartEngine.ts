import {
  Application,
  Container,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";
import { SCREEN_SCROLL_SECONDS } from "../../config/balance/run";
import { gathererFormation, warriorFormation } from "../entities/formation";
import { loadSprites } from "../rendering/loadSprites";
import { spriteManifest } from "../rendering/spriteManifest";
import type { DebugState } from "../state/debugState";
import type { SpriteTextureMap } from "../../types/sprites";

type DebugListener = (state: DebugState) => void;

const GRID_SIZE = 32;

export class BattleCartEngine {
  private readonly app = new Application();
  private readonly stageRoot = new Container();
  private readonly grid = new Graphics();
  private readonly spritesLayer = new Container();
  private readonly onDebug: DebugListener;
  private textures: SpriteTextureMap | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private cartSprite: Sprite | null = null;
  private warriorSprites: Sprite[] = [];
  private gathererSprites: Sprite[] = [];
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

    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.stageRoot);
    this.stageRoot.addChild(this.grid, this.spritesLayer);

    this.textures = await loadSprites();
    if (this.destroyed) {
      return;
    }

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

    if (this.app.renderer) {
      this.app.destroy(true, { children: true });
    }
  }

  private tick() {
    const deltaSeconds = this.app.ticker.deltaMS / 1000;
    const scrollSpeed = this.getScrollSpeed();
    this.scrollOffset = (this.scrollOffset + scrollSpeed * deltaSeconds) % GRID_SIZE;

    this.drawGrid();
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
    return this.app.screen.width / SCREEN_SCROLL_SECONDS;
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
    this.onDebug({
      fps: this.fps,
      width: Math.round(this.app.screen.width),
      height: Math.round(this.app.screen.height),
      scrollSpeed: Math.round(scrollSpeed),
      loadedSprites: this.textures ? spriteManifest.length : 0,
    });
  }
}
