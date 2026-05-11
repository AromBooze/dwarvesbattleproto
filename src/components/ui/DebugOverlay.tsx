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
Run ${debug.runNumber}
Resource range ${debug.effectiveResourceAmountMin}-${debug.effectiveResourceAmountMax}
Wolf pack ${debug.effectiveWolfPackSizeMin}-${debug.effectiveWolfPackSizeMax}
Spawn R/W ${debug.effectiveResourceSpawnInterval.toFixed(1)}s/${debug.effectiveWolfSpawnInterval.toFixed(1)}s
Wolf bonuses HP/D/AS ${debug.wolfHpBonus}/${debug.wolfDamageBonus}/${debug.wolfAttackSpeedBonus}
Run phase ${debug.runPhase}
Run time ${debug.runTimeRemaining.toFixed(1)}s
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
Run complete ${debug.runCompleted ? "yes" : "no"}
Assignment ${debug.lastAssignmentResult}`}
    </div>
  );
}
