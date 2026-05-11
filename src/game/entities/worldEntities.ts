import type { Sprite } from "pixi.js";

export type ResourceType = "wood" | "ore";

export type ResourceEntity = {
  id: string;
  sprite: Sprite;
  type: ResourceType;
  amount: number;
};

export type WolfEntity = {
  id: string;
  sprite: Sprite;
};
