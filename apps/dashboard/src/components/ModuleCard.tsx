import type { ModuleView } from "../api.ts";
import { ToggleCup } from "./ToggleCup.tsx";

/** Ficha de "carta": el objeto físico que se sirve o se pone en pausa. */
export function ModuleCard({
  module,
  busy,
  onToggle,
  onOpen,
}: {
  module: ModuleView;
  busy: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <article className={`card ${module.enabled ? "card--active" : ""}`}>
      {/* El cuerpo abre la página de ajustes; el interruptor (en el pie) togglea aparte. */}
      <button type="button" className="card__open" onClick={onOpen}>
        <span className="stamp">{module.category ?? "módulo"}</span>
        <h3 className="card__name">{module.name}</h3>
        <p className="card__desc">{module.description}</p>
        <span className="card__enter">Ajustar receta →</span>
      </button>
      <div className="card__foot">
        <span className="mono">{module.id}</span>
        {module.locked ? (
          <span className="locked-badge" title="Este módulo no se puede desactivar">
            Siempre activo
          </span>
        ) : (
          <ToggleCup active={module.enabled} busy={busy} onToggle={onToggle} />
        )}
      </div>
    </article>
  );
}
