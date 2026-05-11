import type { UpgradeState } from "../../game/state/upgradeState";

type ResurrectionScreenProps = {
  state: UpgradeState;
  onResurrectWarrior: () => void;
  onResurrectGatherer: () => void;
  onContinue: () => void;
};

function formatCost(cost: UpgradeState["resurrection"]["cost"]) {
  return `🪵 ${cost.wood ?? 0}  ⛓️ ${cost.ore ?? 0}`;
}

export function ResurrectionScreen({
  state,
  onResurrectWarrior,
  onResurrectGatherer,
  onContinue,
}: ResurrectionScreenProps) {
  return (
    <section className="upgrade-screen" aria-label="Resurrection screen">
      <div className="upgrade-shell resurrection-shell">
        <header className="upgrade-header">
          <div>
            <h1>Воскресите пораженных гномов</h1>
            <p>Заезд: {state.runNumber} &nbsp; 🪵 {state.wood} &nbsp; ⛓️ {state.ore}</p>
          </div>
          <button className="next-run-button" type="button" onClick={onContinue}>
            Далее
          </button>
        </header>

        <div className="stat-grid resurrection-stats" aria-label="Resurrection stats">
          <div>
            <strong>Погибшие воины</strong>
            <span>{state.resurrection.deadWarriors}</span>
            <span>Воскрешено {state.resurrection.resurrectedWarriors}</span>
          </div>
          <div>
            <strong>Погибшие собиратели</strong>
            <span>{state.resurrection.deadGatherers}</span>
            <span>Воскрешено {state.resurrection.resurrectedGatherers}</span>
          </div>
          <div>
            <strong>Стоимость</strong>
            <span>{formatCost(state.resurrection.cost)}</span>
            <span>за одного гнома</span>
          </div>
        </div>

        <div className="resurrection-actions">
          <button
            className="upgrade-button resurrection-button"
            disabled={!state.resurrection.canResurrectWarrior}
            type="button"
            onClick={onResurrectWarrior}
          >
            <span>
              <strong>Воскресить воина</strong>
              <small>{formatCost(state.resurrection.cost)}</small>
            </span>
            {state.resurrection.warriorDisabledReason ? (
              <span>
                <small>{state.resurrection.warriorDisabledReason}</small>
              </span>
            ) : null}
          </button>

          <button
            className="upgrade-button resurrection-button"
            disabled={!state.resurrection.canResurrectGatherer}
            type="button"
            onClick={onResurrectGatherer}
          >
            <span>
              <strong>Воскресить собирателя</strong>
              <small>{formatCost(state.resurrection.cost)}</small>
            </span>
            {state.resurrection.gathererDisabledReason ? (
              <span>
                <small>{state.resurrection.gathererDisabledReason}</small>
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </section>
  );
}
