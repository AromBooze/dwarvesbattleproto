type ResourceOverlayProps = {
  wood: number;
  ore: number;
  cartHp: number;
  cartMaxHp: number;
  livingWarriors: number;
  totalWarriors: number;
  livingGatherers: number;
  totalGatherers: number;
  activeWolves: number;
};

export function ResourceOverlay({
  wood,
  ore,
  cartHp,
  cartMaxHp,
  livingWarriors,
  totalWarriors,
  livingGatherers,
  totalGatherers,
  activeWolves,
}: ResourceOverlayProps) {
  return (
    <div className="resource-panel" aria-label="Resources">
      <span>🪵 {wood}</span>
      <span>⛓️ {ore}</span>
      <span>HP {cartHp}/{cartMaxHp}</span>
      <span>W {livingWarriors}/{totalWarriors}</span>
      <span>G {livingGatherers}/{totalGatherers}</span>
      <span>🐺 {activeWolves}</span>
    </div>
  );
}
