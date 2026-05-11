import { Container, Graphics, Sprite, Texture } from "pixi.js";
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
  WOLF_BASE_HP,
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

type DespawnResult = {
  removedResourceIds: string[];
};

type DeathEffect = {
  sprite: Sprite;
  ttl: number;
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
  private readonly deathEffects: DeathEffect[] = [];
  private nextResourceSpawn = RESOURCE_SPAWN_INTERVAL_SECONDS;
  private nextWolfSpawn = WOLF_PACK_SPAWN_INTERVAL_SECONDS;
  private nextResourceId = 1;
  private nextWolfId = 1;

  constructor(
    private readonly layer: Container,
    private readonly textures: SpriteTextureMap,
  ) {}

  update(deltaSeconds: number, scrollSpeed: number, screen: ScreenBounds): DespawnResult {
    const removedResourceIds: string[] = [];

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

    this.moveAndDespawn(deltaSeconds, scrollSpeed, removedResourceIds);
    this.updateDeathEffects(deltaSeconds);
    this.updateResourceVisuals();

    return { removedResourceIds };
  }

  destroy() {
    for (const resource of this.resources) {
      resource.progressBar.destroy();
      resource.sprite.destroy();
    }

    for (const wolf of this.wolves) {
      wolf.sprite.destroy();
    }

    for (const effect of this.deathEffects) {
      effect.sprite.destroy();
    }

    this.resources.length = 0;
    this.wolves.length = 0;
    this.deathEffects.length = 0;
  }

  getDebugState(): SpawnDebugState {
    return {
      activeResources: this.resources.length,
      activeWolves: this.wolves.length,
      nextResourceSpawn: Math.max(0, this.nextResourceSpawn),
      nextWolfSpawn: Math.max(0, this.nextWolfSpawn),
    };
  }

  getResources() {
    return this.resources;
  }

  getWolves() {
    return this.wolves;
  }

  removeWolf(wolfId: string) {
    const index = this.wolves.findIndex((wolf) => wolf.id === wolfId);

    if (index < 0) {
      return false;
    }

    const [wolf] = this.wolves.splice(index, 1);
    this.spawnDeathEffect(wolf.sprite.x, wolf.sprite.y);
    wolf.sprite.destroy();
    return true;
  }

  removeResource(resourceId: string) {
    const index = this.resources.findIndex((resource) => resource.id === resourceId);

    if (index < 0) {
      return false;
    }

    const [resource] = this.resources.splice(index, 1);
    resource.progressBar.destroy();
    resource.sprite.destroy();
    return true;
  }

  updateResourceVisuals() {
    for (const resource of this.resources) {
      this.drawProgressBar(resource);
    }
  }

  private spawnResource(screen: ScreenBounds) {
    const type: ResourceType = Math.random() < WOOD_SPAWN_CHANCE ? "wood" : "ore";
    const texture = type === "wood" ? this.textures.tree : this.textures.ore;
    const sprite = this.createWorldSprite(texture);
    const progressBar = new Graphics();
    const maxAmount = randomIntInclusive(RESOURCE_AMOUNT_MIN, RESOURCE_AMOUNT_MAX);

    sprite.position.set(
      screen.width + SPAWN_OFFSCREEN_PADDING,
      this.randomPlayableY(screen.height),
    );

    this.resources.push({
      id: `resource-${this.nextResourceId}`,
      sprite,
      progressBar,
      type,
      remainingAmount: maxAmount,
      maxAmount,
      assignedGathererIds: new Set(),
    });
    this.nextResourceId += 1;
    this.layer.addChild(sprite);
    this.layer.addChild(progressBar);
    this.drawProgressBar(this.resources[this.resources.length - 1]);
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

      this.wolves.push({
        id: `wolf-${this.nextWolfId}`,
        sprite,
        hp: WOLF_BASE_HP,
        maxHp: WOLF_BASE_HP,
        targetId: null,
        targetType: null,
        attackCooldown: 0,
        flashUntil: 0,
      });
      this.nextWolfId += 1;
      this.layer.addChild(sprite);
    }
  }

  private moveAndDespawn(
    deltaSeconds: number,
    scrollSpeed: number,
    removedResourceIds: string[],
  ) {
    const movement = scrollSpeed * deltaSeconds;

    this.despawnMovedResources(this.resources, movement, removedResourceIds);
  }

  private despawnMovedResources(entities: ResourceEntity[], movement: number, removedResourceIds: string[]) {
    for (let index = entities.length - 1; index >= 0; index -= 1) {
      const entity = entities[index];
      entity.sprite.x -= movement;

      if (entity.sprite.x < -DESPAWN_OFFSCREEN_PADDING) {
        removedResourceIds.push(entity.id);
        entity.progressBar.destroy();
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

  private spawnDeathEffect(x: number, y: number) {
    const sprite = this.createWorldSprite(this.textures.blood_puddle);
    sprite.position.set(x, y);
    this.deathEffects.push({ sprite, ttl: 4 });
    this.layer.addChild(sprite);
  }

  private updateDeathEffects(deltaSeconds: number) {
    for (let index = this.deathEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.deathEffects[index];
      effect.ttl -= deltaSeconds;
      effect.sprite.alpha = Math.min(1, Math.max(0, effect.ttl / 1.5));

      if (effect.ttl <= 0) {
        effect.sprite.destroy();
        this.deathEffects.splice(index, 1);
      }
    }
  }

  private drawProgressBar(resource: ResourceEntity) {
    const width = 28;
    const height = 4;
    const fillPercent = Math.max(0, resource.remainingAmount / resource.maxAmount);
    const x = Math.round(resource.sprite.x - width / 2);
    const y = Math.round(resource.sprite.y - resource.sprite.height - 8);

    resource.progressBar.clear();
    resource.progressBar.rect(x, y, width, height);
    resource.progressBar.fill({ color: 0x141414, alpha: 0.9 });
    resource.progressBar.rect(x + 1, y + 1, Math.max(0, width - 2) * fillPercent, height - 2);
    resource.progressBar.fill({ color: resource.type === "wood" ? 0x56d05f : 0xb8c7d9, alpha: 0.95 });
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
