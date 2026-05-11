export type DebugState = {
  fps: number;
  width: number;
  height: number;
  scrollSpeed: number;
  loadedSprites: number;
  activeResources: number;
  activeWolves: number;
  nextResourceSpawn: number;
  nextWolfSpawn: number;
  gazeMode: string;
  targetsInsideCone: number;
  selectedTarget: string;
  lastCommandInput: string;
};

export const defaultDebugState: DebugState = {
  fps: 0,
  width: 0,
  height: 0,
  scrollSpeed: 0,
  loadedSprites: 0,
  activeResources: 0,
  activeWolves: 0,
  nextResourceSpawn: 0,
  nextWolfSpawn: 0,
  gazeMode: "default",
  targetsInsideCone: 0,
  selectedTarget: "none",
  lastCommandInput: "none",
};
