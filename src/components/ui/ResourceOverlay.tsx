type ResourceOverlayProps = {
  wood: number;
  ore: number;
};

export function ResourceOverlay({ wood, ore }: ResourceOverlayProps) {
  return (
    <div className="resource-panel" aria-label="Resources">
      <span>🪵 {wood}</span>
      <span>⛓️ {ore}</span>
    </div>
  );
}
