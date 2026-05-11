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
  wood: number;
  ore: number;
  availableWarriors: number;
  assignedWarriors: number;
  availableGatherers: number;
  assignedGatherers: number;
  lastAssignmentResult: string;
  activeGatherers: number;
  gatheredResource: string;
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
  wood: 0,
  ore: 0,
  availableWarriors: 0,
  assignedWarriors: 0,
  availableGatherers: 0,
  assignedGatherers: 0,
  lastAssignmentResult: "none",
  activeGatherers: 0,
  gatheredResource: "none",
};
