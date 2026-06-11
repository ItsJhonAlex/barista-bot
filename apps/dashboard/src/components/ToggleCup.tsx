import { useId } from "react";

/** El interruptor firma: una taza que se llena (activo) o queda vacía (en pausa). */
export function ToggleCup({
  active,
  busy,
  onToggle,
}: {
  active: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const clipId = useId();
  return (
    <button
      type="button"
      className={`cup ${active ? "cup--active" : "cup--paused"}`}
      onClick={onToggle}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? "En marcha. Pulsa para pausar" : "En pausa. Pulsa para activar"}
    >
      <svg
        className="cup__svg"
        width="24"
        height="24"
        viewBox="0 0 36 36"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={clipId}>
            <path d="M8 12 h16 v10 a8 8 0 0 1 -16 0 z" />
          </clipPath>
        </defs>
        {/* vapor (solo visible cuando está en marcha, vía CSS) */}
        <path className="steam" d="M14 9 q-1.6 -2.2 0 -4.4" strokeWidth="1.4" />
        <path className="steam" d="M18 9 q-1.6 -2.2 0 -4.4" strokeWidth="1.4" />
        <g clipPath={`url(#${clipId})`}>
          <rect className="fill" x="8" y="12" width="16" height="20" fill="var(--matcha)" />
        </g>
        <path
          d="M8 12 h16 v10 a8 8 0 0 1 -16 0 z"
          fill="none"
          stroke="var(--espresso)"
          strokeWidth="1.6"
        />
        <path
          d="M24 15 h3 a3 3 0 0 1 0 6 h-3"
          fill="none"
          stroke="var(--espresso)"
          strokeWidth="1.6"
        />
      </svg>
      <span className="cup__label">{active ? "Activo" : "En pausa"}</span>
    </button>
  );
}
