import { type ReactNode, useEffect, useState } from "react";
import { type CommandDoc, type ModuleDetailView, type OptionDoc, api } from "../api.ts";
import { SchemaForm } from "./SchemaForm.tsx";

/** Opciones/subcomandos de un comando, anidados. */
function OptionList({ options }: { options: OptionDoc[] }) {
  return (
    <ul className="opt-list">
      {options.map((opt) => (
        <li key={opt.name} className="opt">
          <code className="opt__name">{opt.name}</code>
          <span className="opt__type">
            {opt.type}
            {opt.required ? " · obligatorio" : ""}
          </span>
          <span className="opt__desc">{opt.description}</span>
          {opt.options && opt.options.length > 0 ? <OptionList options={opt.options} /> : null}
        </li>
      ))}
    </ul>
  );
}

function CommandItem({ cmd }: { cmd: CommandDoc }) {
  return (
    <div className="cmd">
      <div className="cmd__head">
        <code className="cmd__name">/{cmd.name}</code>
        <span className="cmd__desc">{cmd.description}</span>
      </div>
      {cmd.options.length > 0 ? <OptionList options={cmd.options} /> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="doc-section">
      <h2 className="doc-section__title">{title}</h2>
      {children}
    </section>
  );
}

/** Página "Ajustes de módulo": documentación del módulo (qué hace, comandos…) + sus ajustes. */
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
            </div>
          </header>

          {data.module.features.length > 0 ? (
            <Section title="Qué hace">
              <ul className="feature-list">
                {data.module.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {data.module.commands.length > 0 ? (
            <Section title="Comandos">
              <div className="cmd-list">
                {data.module.commands.map((cmd) => (
                  <CommandItem key={cmd.name} cmd={cmd} />
                ))}
              </div>
            </Section>
          ) : null}

          {data.module.requiredBotPermissions.length > 0 ? (
            <Section title="Permisos que necesita">
              <div className="perm-chips">
                {data.module.requiredBotPermissions.map((perm) => (
                  <span key={perm} className="chip">
                    {perm}
                  </span>
                ))}
              </div>
            </Section>
          ) : null}

          {data.module.events.length > 0 ? (
            <Section title="Reacciona a">
              <div className="perm-chips">
                {data.module.events.map((ev) => (
                  <span key={ev} className="chip">
                    {ev}
                  </span>
                ))}
              </div>
            </Section>
          ) : null}

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
