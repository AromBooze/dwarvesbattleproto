import { useEffect, useRef, useState } from "react";
import { BattleCartEngine } from "../../game/engine/BattleCartEngine";
import { DebugOverlay } from "../ui/DebugOverlay";
import { ResourceOverlay } from "../ui/ResourceOverlay";
import { TimerOverlay } from "../ui/TimerOverlay";
import { defaultDebugState } from "../../game/state/debugState";

export function GameScreen() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [debug, setDebug] = useState(defaultDebugState);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const engine = new BattleCartEngine(hostRef.current, setDebug);
    void engine.init();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <main className="game-screen">
      <div ref={hostRef} className="pixi-host" aria-label="Battle Cart game canvas" />
      <div className="top-overlay">
        <DebugOverlay debug={debug} />
        <TimerOverlay />
        <ResourceOverlay />
      </div>
    </main>
  );
}
