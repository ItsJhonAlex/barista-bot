import { api } from "../api.ts";

/** Acceso: una sola acción cálida. Fondo papel, una taza humeante, sin ruido. */
export function Login() {
  return (
    <div className="login">
      <div className="login__card">
        <div className="login__coaster">
          <svg className="cupmark" width="56" height="56" viewBox="0 0 48 48" aria-hidden="true">
            {/* vapor */}
            <path className="steam" d="M19 13 q-2.5 -3 0 -6" strokeWidth="1.6" />
            <path className="steam" d="M24 13 q-2.5 -3 0 -6" strokeWidth="1.6" />
            <path className="steam" d="M29 13 q-2.5 -3 0 -6" strokeWidth="1.6" />
            {/* cuerpo de la taza */}
            <path
              d="M12 18 h21 v8.5 a10.5 10.5 0 0 1 -21 0 z"
              fill="var(--latte)"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* café dentro */}
            <path d="M15 20 h15 v6 a7.5 7.5 0 0 1 -15 0 z" fill="var(--terracota)" />
            {/* asa */}
            <path
              d="M33 20.5 h3.5 a4 4 0 0 1 0 8 H33"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* platillo */}
            <path d="M9.5 31 h27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="login__mark">Barista</div>
        <p className="login__tagline serif-italic">La barra desde donde se atiende tu servidor.</p>
        <a className="btn-discord" href={api.loginUrl}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.5c1.7.4 2.5.9 3.4 1.5a13.3 13.3 0 0 0-10.9 0c.9-.6 1.9-1.1 3.4-1.5L10.9 3A19.8 19.8 0 0 0 6 4.4 20.6 20.6 0 0 0 2.4 18a19.9 19.9 0 0 0 6 3l.7-1.2c-1-.4-1.9-.8-2.6-1.4l.6-.4a14.2 14.2 0 0 0 12 0l.6.4c-.8.6-1.7 1-2.6 1.4l.7 1.2a19.9 19.9 0 0 0 6-3 20.6 20.6 0 0 0-3.6-13.6ZM9 14.5c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2Zm6 0c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2Z" />
          </svg>
          Entrar con Discord
        </a>
      </div>
    </div>
  );
}
