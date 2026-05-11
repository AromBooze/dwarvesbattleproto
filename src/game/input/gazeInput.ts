export type GazeMode = "default" | "gather" | "attack";

export type CommandInput = "none" | "gather-select" | "attack-select" | "cancel-gather" | "cancel-warriors" | "global-recall";

export type PointerState = {
  x: number;
  y: number;
  leftDown: boolean;
  rightDown: boolean;
};

export function getGazeMode(pointer: PointerState): GazeMode {
  if (pointer.rightDown) {
    return "attack";
  }

  if (pointer.leftDown) {
    return "gather";
  }

  return "default";
}
