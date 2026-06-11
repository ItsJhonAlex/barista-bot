import { type FormEvent, useState } from "react";
import { ApiError, type JsonSchema, type JsonSchemaProperty } from "../api.ts";

type Values = Record<string, unknown>;
type Control = "text" | "textarea" | "switch" | "number" | "select";

/** Humaniza una clave camelCase/kebab cuando el schema no trae `description`. */
function humanize(key: string): string {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Mapeo tipo/anotación del JSON Schema → control (docs/08 §5). */
function controlFor(prop: JsonSchemaProperty, name: string): Control {
  if (prop.enum) return "select";
  if (prop.type === "boolean") return "switch";
  if (prop.type === "number" || prop.type === "integer") return "number";
  const long = (prop.maxLength ?? 0) > 120 || /message|content|details|mensaje|texto/i.test(name);
  return long ? "textarea" : "text";
}

function Control({
  control,
  id,
  prop,
  value,
  onChange,
}: {
  control: Control;
  id: string;
  prop: JsonSchemaProperty;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (control === "textarea") {
    return (
      <textarea
        id={id}
        className="field__input field__textarea"
        rows={3}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (control === "number") {
    return (
      <input
        id={id}
        type="number"
        className="field__input"
        min={prop.minimum}
        max={prop.maximum}
        value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    );
  }
  if (control === "select") {
    return (
      <select
        id={id}
        className="field__input field__select"
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value)}
      >
        {(prop.enum ?? []).map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {String(opt)}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      id={id}
      type="text"
      className="field__input"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Field({
  name,
  prop,
  required,
  value,
  error,
  onChange,
}: {
  name: string;
  prop: JsonSchemaProperty;
  required: boolean;
  value: unknown;
  error: string | undefined;
  onChange: (value: unknown) => void;
}) {
  const control = controlFor(prop, name);
  const label = prop.description ?? humanize(name);
  const id = `field-${name}`;

  // El switch lleva la etiqueta al lado, no encima.
  if (control === "switch") {
    const checked = value === true;
    return (
      <div className={`field field--switch ${error ? "field--error" : ""}`}>
        <button
          type="button"
          id={id}
          role="switch"
          aria-checked={checked}
          className={`switch ${checked ? "switch--on" : ""}`}
          onClick={() => onChange(!checked)}
        >
          <span className="switch__knob" />
        </button>
        <label htmlFor={id} className="field__label field__label--inline">
          {label}
        </label>
        {error ? <span className="field__error">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className={`field ${error ? "field--error" : ""}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required ? <span className="field__req"> *</span> : null}
      </label>
      <Control control={control} id={id} prop={prop} value={value} onChange={onChange} />
      {error ? <span className="field__error">{error}</span> : null}
    </div>
  );
}

/**
 * Formulario autogenerado desde el `configSchema` de un módulo (JSON Schema vía la api). La
 * api es la autoridad de validación (RF-26): al guardar, los errores 422 se pintan junto al
 * campo. "Guardar receta" → toast "Receta guardada".
 */
export function SchemaForm({
  schema,
  initialValues,
  onSave,
}: {
  schema: JsonSchema;
  initialValues: Values;
  onSave: (values: Values) => Promise<void>;
}) {
  const properties = schema.properties ?? {};
  const keys = Object.keys(properties);
  const required = new Set(schema.required ?? []);

  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (keys.length === 0) {
    return <div className="empty">Este módulo no tiene ajustes que servir.</div>;
  }

  const set = (name: string, value: unknown) => {
    setValues((cur) => ({ ...cur, [name]: value }));
    setDirty(true);
    setSaved(false);
    setErrors((cur) => {
      if (!(name in cur)) return cur;
      const next = { ...cur };
      delete next[name];
      return next;
    });
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    setErrors({});
    try {
      await onSave(values);
      setDirty(false);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details) {
        const map: Record<string, string> = {};
        for (const issue of err.details) {
          const field = String(issue.path[0] ?? "");
          if (field) map[field] = issue.message;
        }
        setErrors(map);
      } else {
        setSaveError(err instanceof Error ? err.message : "No se pudo guardar la receta.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="schema-form" onSubmit={submit} noValidate>
      {saveError ? <div className="error-banner">{saveError}</div> : null}
      <div className="fields">
        {keys.map((name) => (
          <Field
            key={name}
            name={name}
            prop={properties[name] ?? {}}
            required={required.has(name)}
            value={values[name]}
            error={errors[name]}
            onChange={(value) => set(name, value)}
          />
        ))}
      </div>
      <div className="schema-form__foot">
        <button type="submit" className="btn-primary" disabled={!dirty || busy}>
          {busy ? "Guardando…" : "Guardar receta"}
        </button>
        {saved ? <span className="saved-hint">✓ Receta guardada</span> : null}
      </div>
    </form>
  );
}
