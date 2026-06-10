import type { ModuleView } from "../api.ts";
import { ToggleCup } from "./ToggleCup.tsx";

/** Ficha de "carta": el objeto físico que se sirve o se pone en pausa. */
export function ModuleCard({
  module,
  busy,
  onToggle,
}: {
  module: ModuleView;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={`card ${module.enabled ? "card--active" : ""}`}>
      <span className="eyebrow">{module.category ?? "módulo"}</span>
      <h3 className="card__name">{module.name}</h3>
      <p className="card__desc">{module.description}</p>
      <div className="card__foot">
        <span className="mono">{module.id}</span>
        <ToggleCup active={module.enabled} busy={busy} onToggle={onToggle} />
      </div>
    </article>
  );
}
