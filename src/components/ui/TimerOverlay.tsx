type TimerOverlayProps = {
  seconds: number;
};

function formatTime(seconds: number) {
  const clampedSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clampedSeconds / 60);
  const remainingSeconds = clampedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function TimerOverlay({ seconds }: TimerOverlayProps) {
  return (
    <div className="timer-panel" aria-label="Run timer">
      {formatTime(seconds)}
    </div>
  );
}
