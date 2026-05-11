export type GazeMode = "default" | "gather" | "attack";

export type CommandInput = "none" | "gather-select" | "attack-select" | "cancel-gather" | "cancel-warriors" | "global-recall";

export type PointerState = {
  x: number;
  y: number;
};
