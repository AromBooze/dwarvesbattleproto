export type DebugState = {
  fps: number;
  width: number;
  height: number;
  scrollSpeed: number;
  loadedSprites: number;
};

export const defaultDebugState: DebugState = {
  fps: 0,
  width: 0,
  height: 0,
  scrollSpeed: 0,
  loadedSprites: 0,
};
