import { useEffect, useState } from "react";
import { type AdminGuild, ApiError, type ModuleView, type SessionUser, api } from "./api.ts";
import { Login } from "./components/Login.tsx";
import { ModuleCard } from "./components/ModuleCard.tsx";
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

function Dashboard({ user }: { user: SessionUser }) {
  const [guilds, setGuilds] = useState<AdminGuild[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <span className="topbar__brand">Barista</span>
        <div className="topbar__profile">
          {user.image ? <img className="avatar" src={user.image} alt="" /> : null}
          <span>{user.name}</span>
          <button type="button" className="btn-ghost" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <div className="body">
        <ServerShelf guilds={guilds ?? []} selected={selected} onSelect={setSelected} />
        <main className="main">
          {error ? <div className="error-banner">{error}</div> : null}
          {selected ? (
            <ModuleGrid guildId={selected} />
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

function ModuleGrid({ guildId }: { guildId: string }) {
  const [modules, setModules] = useState<ModuleView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el módulo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <h1 className="page-title">La carta</h1>
      <p className="page-sub">Sirve o pon en pausa cada módulo en este servidor.</p>
      {error ? <div className="error-banner">{error}</div> : null}

      {modules === null ? (
        <p className="page-sub">Preparando la carta…</p>
      ) : modules.length === 0 ? (
        <div className="empty">Esta carta está vacía todavía.</div>
      ) : (
        <div className="grid">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              busy={busy === module.id}
              onToggle={() => void toggle(module)}
            />
          ))}
        </div>
      )}
    </>
  );
}
