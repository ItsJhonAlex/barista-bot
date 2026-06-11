import { useEffect, useRef, useState } from "react";
import { type AdminGuild, ApiError, type ModuleView, type SessionUser, api } from "./api.ts";
import { Login } from "./components/Login.tsx";
import { ModuleCard } from "./components/ModuleCard.tsx";
import { ModuleDetail } from "./components/ModuleDetail.tsx";
import { ServerShelf } from "./components/ServerShelf.tsx";

type Phase = { t: "loading" } | { t: "login" } | { t: "ready"; user: SessionUser };

export function App() {
  const [phase, setPhase] = useState<Phase>({ t: "loading" });

  useEffect(() => {
    api
      .me()
      .then((r) => setPhase(r.user ? { t: "ready", user: r.user } : { t: "login" }))
      .catch(() => setPhase({ t: "login" }));
  }, []);

  if (phase.t === "loading") return <div className="state">Calentando la cafetera…</div>;
  if (phase.t === "login") return <Login />;
  return <Dashboard user={phase.user} />;
}

/** Logomark de taza para la barra superior. */
function CupGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 36 36" aria-hidden="true" className="cupmark">
      <path
        d="M8 13 h16 v9 a8 8 0 0 1 -16 0 z"
        fill="var(--latte)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10.5 14.5 h11 v6.5 a5.5 5.5 0 0 1 -11 0 z" fill="var(--terracota)" />
      <path d="M24 15 h3 a3 3 0 0 1 0 6 h-3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Dashboard({ user }: { user: SessionUser }) {
  const [guilds, setGuilds] = useState<AdminGuild[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cambiar de servidor vuelve a la carta (cierra el detalle de módulo abierto).
  const selectGuild = (id: string) => {
    setSelected(id);
    setSelectedModule(null);
  };

  useEffect(() => {
    api
      .myGuilds()
      .then((r) => {
        setGuilds(r.guilds);
        setSelected((cur) => cur ?? r.guilds[0]?.id ?? null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "No se pudieron cargar los servidores."),
      );
  }, []);

  const logout = () => {
    api.logout().finally(() => window.location.reload());
  };

  return (
    <div className="shell">
      <header className="topbar">
        <span className="topbar__brandwrap">
          <CupGlyph />
          <span className="topbar__brand">Barista</span>
        </span>
        <div className="topbar__profile">
          {user.image ? <img className="avatar" src={user.image} alt="" /> : null}
          <span className="topbar__name">{user.name}</span>
          <button type="button" className="btn-ghost" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <div className="body">
        <ServerShelf guilds={guilds ?? []} selected={selected} onSelect={selectGuild} />
        <main className="main">
          {error ? <div className="error-banner">{error}</div> : null}
          {selected ? (
            selectedModule ? (
              <ModuleDetail
                guildId={selected}
                moduleId={selectedModule}
                onBack={() => setSelectedModule(null)}
              />
            ) : (
              <ModuleGrid guildId={selected} onOpenModule={setSelectedModule} />
            )
          ) : guilds === null ? (
            <p className="page-sub">Buscando tus servidores…</p>
          ) : (
            <div className="empty">
              Aún no administras ningún servidor con Barista dentro. Invítalo a un servidor para
              empezar.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

interface ToastItem {
  id: number;
  label: string;
  on: boolean;
}

function ModuleGrid({
  guildId,
  onOpenModule,
}: {
  guildId: string;
  onOpenModule: (moduleId: string) => void;
}) {
  const [modules, setModules] = useState<ModuleView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeq = useRef(0);

  const pushToast = (label: string, on: boolean) => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToasts((cur) => [...cur, { id, label, on }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 2600);
  };

  useEffect(() => {
    setModules(null);
    setError(null);
    api
      .guildModules(guildId)
      .then((r) => setModules(r.modules))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) {
          setError("No administras este servidor.");
        } else {
          setError(e instanceof Error ? e.message : "No se pudo cargar la carta.");
        }
      });
  }, [guildId]);

  const toggle = async (module: ModuleView) => {
    setBusy(module.id);
    setError(null);
    try {
      const result = await api.setModule(guildId, module.id, !module.enabled);
      setModules(
        (cur) =>
          cur?.map((m) => (m.id === module.id ? { ...m, enabled: result.enabled } : m)) ?? null,
      );
      pushToast(`${module.name} · ${result.enabled ? "servido" : "en pausa"}`, result.enabled);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el módulo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">La carta</span>
        <h1 className="page-title">Módulos del servidor</h1>
        <p className="page-sub">
          Sirve o pon en pausa cada módulo. El cambio llega al bot al instante.
        </p>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}

      {modules === null ? (
        <div className="grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholders estáticos de carga
            <div key={i} className="card-skeleton" />
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="empty">Esta carta está vacía todavía. Activa tu primer módulo.</div>
      ) : (
        <div className="grid">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              busy={busy === module.id}
              onToggle={() => void toggle(module)}
              onOpen={() => onOpenModule(module.id)}
            />
          ))}
        </div>
      )}

      {toasts.length > 0 ? (
        <div className="toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.on ? "toast--on" : "toast--off"}`}>
              <span className="toast__dot" />
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
