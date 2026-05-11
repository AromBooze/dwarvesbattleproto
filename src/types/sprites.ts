export type SpriteId =
  | "cart"
  | "warrior"
  | "gatherer"
  | "tree"
  | "ore"
  | "wolf"
  | "blood_puddle";

export type SpriteManifestEntry = {
  id: SpriteId;
  path: string;
};

export type SpriteTextureMap = Record<SpriteId, import("pixi.js").Texture>;
