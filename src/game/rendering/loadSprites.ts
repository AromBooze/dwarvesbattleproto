import { Assets, Texture, TextureStyle } from "pixi.js";
import type { SpriteId, SpriteTextureMap } from "../../types/sprites";
import { spriteManifest } from "./spriteManifest";

export async function loadSprites(): Promise<SpriteTextureMap> {
  TextureStyle.defaultOptions.scaleMode = "nearest";

  const entries = await Promise.all(
    spriteManifest.map(async ({ id, path }) => {
      const texture = await Assets.load<Texture>(path);
      texture.source.scaleMode = "nearest";
      return [id, texture] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<SpriteId, Texture>;
}
