import type { DebugState } from "../../game/state/debugState";

type DebugOverlayProps = {
  debug: DebugState;
};

export function DebugOverlay({ debug }: DebugOverlayProps) {
  return (
    <div className="debug-panel" aria-label="Debug overlay">
      {`FPS ${debug.fps}
Resolution ${debug.width}x${debug.height}
Scroll speed ${debug.scrollSpeed}px/s
Loaded sprites ${debug.loadedSprites}
Resources ${debug.activeResources}
Wolves ${debug.activeWolves}
Next resource ${debug.nextResourceSpawn.toFixed(1)}s
Next wolf ${debug.nextWolfSpawn.toFixed(1)}s
Gaze mode ${debug.gazeMode}
Targets in cone ${debug.targetsInsideCone}
Selected ${debug.selectedTarget}
Last input ${debug.lastCommandInput}
Wood ${debug.wood}
Ore ${debug.ore}
Warriors ${debug.availableWarriors}/${debug.assignedWarriors}
Gatherers ${debug.availableGatherers}/${debug.assignedGatherers}
Active gatherers ${debug.activeGatherers}
Gathering ${debug.gatheredResource}
Combats ${debug.activeCombats}
Wolves on cart ${debug.wolvesTargetingCart}
Dead W/G ${debug.deadWarriors}/${debug.deadGatherers}
Game over ${debug.gameOver ? "yes" : "no"}
Assignment ${debug.lastAssignmentResult}`}
    </div>
  );
}
