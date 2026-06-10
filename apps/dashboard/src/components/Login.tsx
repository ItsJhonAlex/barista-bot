import { api } from "../api.ts";

/** Acceso: una sola acción cálida. Fondo papel, sin ruido. */
export function Login() {
  return (
    <div className="login">
      <div className="login__card">
        <div className="login__mark">Barista</div>
        <p className="login__tagline">La barra desde donde se atiende tu servidor.</p>
        <a className="btn-discord" href={api.loginUrl}>
          {/* glifo de Discord */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.5c1.7.4 2.5.9 3.4 1.5a13.3 13.3 0 0 0-10.9 0c.9-.6 1.9-1.1 3.4-1.5L10.9 3A19.8 19.8 0 0 0 6 4.4 20.6 20.6 0 0 0 2.4 18a19.9 19.9 0 0 0 6 3l.7-1.2c-1-.4-1.9-.8-2.6-1.4l.6-.4a14.2 14.2 0 0 0 12 0l.6.4c-.8.6-1.7 1-2.6 1.4l.7 1.2a19.9 19.9 0 0 0 6-3 20.6 20.6 0 0 0-3.6-13.6ZM9 14.5c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2Zm6 0c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2Z" />
          </svg>
          Entrar con Discord
        </a>
      </div>
    </div>
  );
}
