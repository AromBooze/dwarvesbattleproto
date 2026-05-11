import type { SpriteId, SpriteManifestEntry } from "../../types/sprites";

const spriteBasePath = "/Sprites/individual_sprites";

export const spriteManifest: SpriteManifestEntry[] = [
  { id: "cart", path: `${spriteBasePath}/cart.png` },
  { id: "warrior", path: `${spriteBasePath}/warrior.png` },
  { id: "gatherer", path: `${spriteBasePath}/gatherer.png` },
  { id: "tree", path: `${spriteBasePath}/tree.png` },
  { id: "ore", path: `${spriteBasePath}/ore.png` },
  { id: "wolf", path: `${spriteBasePath}/wolf.png` },
  { id: "blood_puddle", path: `${spriteBasePath}/blood_puddle.png` },
];

export const spriteIds = spriteManifest.map((sprite) => sprite.id) as SpriteId[];
