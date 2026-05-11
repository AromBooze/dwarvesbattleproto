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
Next wolf ${debug.nextWolfSpawn.toFixed(1)}s`}
    </div>
  );
}
