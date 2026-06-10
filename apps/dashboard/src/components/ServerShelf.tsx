import type { AdminGuild } from "../api.ts";

function iconUrl(guild: AdminGuild): string | null {
  return guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`
    : null;
}

/** La estantería de servidores: cada uno es una "taza" en el estante. */
export function ServerShelf({
  guilds,
  selected,
  onSelect,
}: {
  guilds: AdminGuild[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="shelf" aria-label="Servidores">
      <p className="eyebrow shelf__title">Estantería</p>
      {guilds.map((guild) => {
        const url = iconUrl(guild);
        return (
          <button
            key={guild.id}
            type="button"
            className={`mug ${guild.id === selected ? "mug--active" : ""}`}
            onClick={() => onSelect(guild.id)}
            aria-current={guild.id === selected}
          >
            <span className="mug__icon">
              {url ? <img src={url} alt="" /> : guild.name.charAt(0).toUpperCase()}
            </span>
            <span>
              <span className="mug__name">{guild.name}</span>
              <br />
              <span className="mug__meta">servidor</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
