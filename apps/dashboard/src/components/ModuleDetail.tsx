import { useEffect, useState } from "react";
import { type ModuleDetailView, api } from "../api.ts";
import { SchemaForm } from "./SchemaForm.tsx";

/** Página "Ajustes de módulo": entrar a un módulo para ver su detalle y ajustar su receta. */
export function ModuleDetail({
  guildId,
  moduleId,
  onBack,
}: {
  guildId: string;
  moduleId: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<ModuleDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    api
      .moduleDetail(guildId, moduleId)
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "No se pudo abrir el módulo."),
      );
  }, [guildId, moduleId]);

  return (
    <div className="module-detail">
      <button type="button" className="back-link" onClick={onBack}>
        ← Volver a la carta
      </button>

      {error ? <div className="error-banner">{error}</div> : null}

      {data === null && !error ? (
        <p className="page-sub">Abriendo el módulo…</p>
      ) : data ? (
        <>
          <header className="module-detail__head">
            <span className="stamp">{data.module.category ?? "módulo"}</span>
            <div className="module-detail__title">
              <h1 className="page-title">{data.module.name}</h1>
              <span
                className={`status-pill ${
                  data.module.enabled ? "status-pill--on" : "status-pill--off"
                }`}
              >
                {data.module.enabled ? "Activo" : "En pausa"}
              </span>
            </div>
            <p className="module-detail__desc">{data.module.details ?? data.module.description}</p>
            <div className="module-detail__tags">
              <span className="mono">
                {data.module.id} · v{data.module.version}
              </span>
              {data.module.requiredBotPermissions.length > 0 ? (
                <span className="perm-chips">
                  {data.module.requiredBotPermissions.map((perm) => (
                    <span key={perm} className="chip">
                      {perm}
                    </span>
                  ))}
                </span>
              ) : null}
            </div>
          </header>

          <section className="card module-detail__panel">
            <span className="eyebrow">Ajustar receta</span>
            <SchemaForm
              schema={data.schema}
              initialValues={data.config}
              onSave={(values) =>
                api.saveModuleConfig(guildId, moduleId, values).then(() => undefined)
              }
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
