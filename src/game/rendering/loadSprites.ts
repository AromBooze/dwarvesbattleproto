import { Assets, Texture, TextureStyle } from "pixi.js";
import type { SpriteId, SpriteTextureMap } from "../../types/sprites";
import { spriteManifest } from "./spriteManifest";

export async function loadSprites(): Promise<SpriteTextureMap> {
  TextureStyle.defaultOptions.scaleMode = "nearest";

  const entries = await Promise.all(
    spriteManifest.map(async ({ id, path }) => {
      let texture: Texture;

      try {
        texture = await Assets.load<Texture>(path);
      } catch (error) {
        console.warn(`[sprites] Failed to load sprite "${id}" from "${path}".`, error);
        texture = Texture.EMPTY;
      }

      texture.source.scaleMode = "nearest";

      if (texture === Texture.EMPTY || texture.width <= 1 || texture.height <= 1) {
        console.warn(`[sprites] Sprite "${id}" from "${path}" loaded as an empty texture.`);
      }

      return [id, texture] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<SpriteId, Texture>;
}
