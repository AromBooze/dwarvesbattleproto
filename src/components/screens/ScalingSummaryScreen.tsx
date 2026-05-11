import type { UpgradeState } from "../../game/state/upgradeState";

type ScalingSummaryScreenProps = {
  state: UpgradeState;
  onContinue: () => void;
};

export function ScalingSummaryScreen({ state, onContinue }: ScalingSummaryScreenProps) {
  return (
    <section className="upgrade-screen" aria-label="Scaling summary">
      <div className="upgrade-shell scaling-shell">
        <header className="upgrade-header">
          <div>
            <h1>Мир становится опаснее</h1>
            <p>Заезд: {state.runNumber}</p>
          </div>
          <button className="next-run-button" type="button" onClick={onContinue}>
            Продолжить
          </button>
        </header>

        <div className="scaling-summary-list">
          {state.scalingSummary.messages.map((message) => (
            <div className="scaling-summary-row" key={message}>
              {message}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
