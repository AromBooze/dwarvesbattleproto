import type { Graphics, Sprite } from "pixi.js";

export type ResourceType = "wood" | "ore";

export type ResourceEntity = {
  id: string;
  sprite: Sprite;
  progressBar: Graphics;
  type: ResourceType;
  remainingAmount: number;
  maxAmount: number;
  assignedGathererIds: Set<string>;
};

export type WolfEntity = {
  id: string;
  sprite: Sprite;
};
