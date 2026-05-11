import { Container, Sprite, Texture } from "pixi.js";
import {
  DESPAWN_OFFSCREEN_PADDING,
  SPAWN_OFFSCREEN_PADDING,
  SPAWN_VERTICAL_BOTTOM_PADDING,
  SPAWN_VERTICAL_TOP_PADDING,
} from "../../config/balance/spawn";
import {
  RESOURCE_AMOUNT_MAX,
  RESOURCE_AMOUNT_MIN,
  RESOURCE_SPAWN_INTERVAL_SECONDS,
  WOOD_SPAWN_CHANCE,
} from "../../config/balance/resources";
import {
  WOLF_PACK_SIZE_MAX,
  WOLF_PACK_SIZE_MIN,
  WOLF_PACK_SPAWN_INTERVAL_SECONDS,
} from "../../config/balance/wolves";
import type { ResourceEntity, ResourceType, WolfEntity } from "../entities/worldEntities";
import type { SpriteTextureMap } from "../../types/sprites";
import { randomFloat, randomIntInclusive } from "../../utils/random";

type ScreenBounds = {
  width: number;
  height: number;
};

export type SpawnDebugState = {
  activeResources: number;
  activeWolves: number;
  nextResourceSpawn: number;
  nextWolfSpawn: number;
};

export class SpawnSystem {
  private readonly resources: ResourceEntity[] = [];
  private readonly wolves: WolfEntity[] = [];
  private nextResourceSpawn = RESOURCE_SPAWN_INTERVAL_SECONDS;
  private nextWolfSpawn = WOLF_PACK_SPAWN_INTERVAL_SECONDS;

  constructor(
    private readonly layer: Container,
    private readonly textures: SpriteTextureMap,
  ) {}

  update(deltaSeconds: number, scrollSpeed: number, screen: ScreenBounds) {
    this.nextResourceSpawn -= deltaSeconds;
    this.nextWolfSpawn -= deltaSeconds;

    while (this.nextResourceSpawn <= 0) {
      this.spawnResource(screen);
      this.nextResourceSpawn += RESOURCE_SPAWN_INTERVAL_SECONDS;
    }

    while (this.nextWolfSpawn <= 0) {
      this.spawnWolfPack(screen);
      this.nextWolfSpawn += WOLF_PACK_SPAWN_INTERVAL_SECONDS;
    }

    this.moveAndDespawn(deltaSeconds, scrollSpeed);
  }

  destroy() {
    for (const resource of this.resources) {
      resource.sprite.destroy();
    }

    for (const wolf of this.wolves) {
      wolf.sprite.destroy();
    }

    this.resources.length = 0;
    this.wolves.length = 0;
  }

  getDebugState(): SpawnDebugState {
    return {
      activeResources: this.resources.length,
      activeWolves: this.wolves.length,
      nextResourceSpawn: Math.max(0, this.nextResourceSpawn),
      nextWolfSpawn: Math.max(0, this.nextWolfSpawn),
    };
  }

  private spawnResource(screen: ScreenBounds) {
    const type: ResourceType = Math.random() < WOOD_SPAWN_CHANCE ? "wood" : "ore";
    const texture = type === "wood" ? this.textures.tree : this.textures.ore;
    const sprite = this.createWorldSprite(texture);

    sprite.position.set(
      screen.width + SPAWN_OFFSCREEN_PADDING,
      this.randomPlayableY(screen.height),
    );

    this.resources.push({
      sprite,
      type,
      amount: randomIntInclusive(RESOURCE_AMOUNT_MIN, RESOURCE_AMOUNT_MAX),
    });
    this.layer.addChild(sprite);
  }

  private spawnWolfPack(screen: ScreenBounds) {
    const packSize = randomIntInclusive(WOLF_PACK_SIZE_MIN, WOLF_PACK_SIZE_MAX);
    const baseX = screen.width + SPAWN_OFFSCREEN_PADDING;
    const baseY = this.randomPlayableY(screen.height);
    const columns = 4;
    const xSpacing = 28;
    const ySpacing = 22;

    for (let index = 0; index < packSize; index += 1) {
      const sprite = this.createWorldSprite(this.textures.wolf);
      const column = index % columns;
      const row = Math.floor(index / columns);
      const rowCenterOffset = ((Math.min(packSize - row * columns, columns) - 1) * xSpacing) / 2;

      sprite.position.set(
        baseX + column * xSpacing - rowCenterOffset,
        this.clampPlayableY(baseY + row * ySpacing - ySpacing, screen.height),
      );

      this.wolves.push({ sprite });
      this.layer.addChild(sprite);
    }
  }

  private moveAndDespawn(deltaSeconds: number, scrollSpeed: number) {
    const movement = scrollSpeed * deltaSeconds;

    this.despawnMovedEntities(this.resources, movement);
    this.despawnMovedEntities(this.wolves, movement);
  }

  private despawnMovedEntities<T extends { sprite: Sprite }>(entities: T[], movement: number) {
    for (let index = entities.length - 1; index >= 0; index -= 1) {
      const entity = entities[index];
      entity.sprite.x -= movement;

      if (entity.sprite.x < -DESPAWN_OFFSCREEN_PADDING) {
        entity.sprite.destroy();
        entities.splice(index, 1);
      }
    }
  }

  private createWorldSprite(texture: Texture) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0.85);
    sprite.roundPixels = true;
    return sprite;
  }

  private randomPlayableY(screenHeight: number) {
    const minY = SPAWN_VERTICAL_TOP_PADDING;
    const maxY = Math.max(minY, screenHeight - SPAWN_VERTICAL_BOTTOM_PADDING);
    return randomFloat(minY, maxY);
  }

  private clampPlayableY(y: number, screenHeight: number) {
    const minY = SPAWN_VERTICAL_TOP_PADDING;
    const maxY = Math.max(minY, screenHeight - SPAWN_VERTICAL_BOTTOM_PADDING);
    return Math.min(maxY, Math.max(minY, y));
  }
}
