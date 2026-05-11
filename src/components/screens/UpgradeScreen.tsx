import type { UpgradeId } from "../../config/balance/upgrades";
import type { UpgradeButtonState, UpgradeState } from "../../game/state/upgradeState";

type UpgradeScreenProps = {
  state: UpgradeState;
  onBuyUpgrade: (id: UpgradeId) => void;
  onStartNextRun: () => void;
};

const groupLabels = {
  cart: "Cart",
  warriors: "Warriors",
  gatherers: "Gatherers",
} as const;

function formatCost(cost: UpgradeButtonState["cost"]) {
  const parts = [];

  if (cost.wood) {
    parts.push(`🪵 ${cost.wood}`);
  }

  if (cost.ore) {
    parts.push(`⛓️ ${cost.ore}`);
  }

  return parts.join("  ");
}

export function UpgradeScreen({ state, onBuyUpgrade, onStartNextRun }: UpgradeScreenProps) {
  const groupedUpgrades = {
    cart: state.upgrades.filter((upgrade) => upgrade.group === "cart"),
    warriors: state.upgrades.filter((upgrade) => upgrade.group === "warriors"),
    gatherers: state.upgrades.filter((upgrade) => upgrade.group === "gatherers"),
  };

  return (
    <section className="upgrade-screen" aria-label="Upgrade screen">
      <div className="upgrade-shell">
        <header className="upgrade-header">
          <div>
            <h1>Между заездами</h1>
            <p>🪵 {state.wood} &nbsp; ⛓️ {state.ore}</p>
          </div>
          <button className="next-run-button" type="button" onClick={onStartNextRun}>
            Следующий заезд
          </button>
        </header>

        <div className="stat-grid" aria-label="Current stats">
          <div>
            <strong>Cart</strong>
            <span>HP {state.cart.maxHp}</span>
            <span>Armor {state.cart.armor}</span>
            <span>Spikes {state.cart.spikes}</span>
          </div>
          <div>
            <strong>Warriors</strong>
            <span>Count {state.warriors.count}</span>
            <span>HP {state.warriors.hp}</span>
            <span>Damage {state.warriors.damage}</span>
            <span>Attack {state.warriors.attackSpeed}/s</span>
            <span>Regen {state.warriors.regeneration}/s</span>
          </div>
          <div>
            <strong>Gatherers</strong>
            <span>Count {state.gatherers.count}</span>
            <span>HP {state.gatherers.hp}</span>
            <span>Gather {state.gatherers.gathering}/s</span>
            <span>Regen {state.gatherers.regeneration}/s</span>
          </div>
        </div>

        <div className="upgrade-groups">
          {(["cart", "warriors", "gatherers"] as const).map((group) => (
            <section className="upgrade-group" key={group} aria-label={`${groupLabels[group]} upgrades`}>
              <h2>{groupLabels[group]}</h2>
              {groupedUpgrades[group].map((upgrade) => (
                <button
                  className="upgrade-button"
                  disabled={upgrade.disabled}
                  key={upgrade.id}
                  type="button"
                  onClick={() => onBuyUpgrade(upgrade.id)}
                >
                  <span>
                    <strong>{upgrade.label}</strong>
                    <small>{upgrade.effect}</small>
                  </span>
                  <span>
                    <b>{formatCost(upgrade.cost)}</b>
                    {upgrade.disabledReason ? <small>{upgrade.disabledReason}</small> : null}
                  </span>
                </button>
              ))}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
