import { useEffect, useRef, useState } from "react";
import { BattleCartEngine } from "../../game/engine/BattleCartEngine";
import { DebugOverlay } from "../ui/DebugOverlay";
import { ResourceOverlay } from "../ui/ResourceOverlay";
import { TimerOverlay } from "../ui/TimerOverlay";
import { defaultDebugState } from "../../game/state/debugState";
import { defaultUpgradeState } from "../../game/state/upgradeState";
import { UpgradeScreen } from "./UpgradeScreen";

export function GameScreen() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<BattleCartEngine | null>(null);
  const [debug, setDebug] = useState(defaultDebugState);
  const [upgrades, setUpgrades] = useState(defaultUpgradeState);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const engine = new BattleCartEngine(hostRef.current, setDebug, setUpgrades);
    engineRef.current = engine;
    void engine.init();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <main className="game-screen">
      <div ref={hostRef} className="pixi-host" aria-label="Battle Cart game canvas" />
      <div className="top-overlay">
        <DebugOverlay debug={debug} />
        <TimerOverlay seconds={debug.runTimeRemaining} />
        <ResourceOverlay
          wood={debug.wood}
          ore={debug.ore}
          cartHp={debug.cartHp}
          cartMaxHp={debug.cartMaxHp}
          livingWarriors={debug.livingWarriors}
          totalWarriors={debug.totalWarriors}
          livingGatherers={debug.livingGatherers}
          totalGatherers={debug.totalGatherers}
          activeWolves={debug.activeWolves}
        />
      </div>
      {upgrades.phase === "upgrade" ? (
        <UpgradeScreen
          state={upgrades}
          onBuyUpgrade={(id) => engineRef.current?.buyUpgrade(id)}
          onStartNextRun={() => engineRef.current?.startNextRun()}
        />
      ) : null}
    </main>
  );
}
