import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type Base = { etiqueta: ReactNode; error?: string; ayuda?: ReactNode; id: string };

const claseCampo =
  "mt-1 block w-full rounded-xl border-0 bg-white px-4 py-3 text-base text-tinta ring-1 ring-tinta/20 placeholder:text-niebla focus:ring-2 focus:ring-azafran-oscuro aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-pimenton";

function Pie({ id, error, ayuda }: { id: string; error?: string; ayuda?: ReactNode }) {
  return (
    <>
      {ayuda && !error ? <p id={`${id}-ayuda`} className="mt-1 text-sm text-niebla">{ayuda}</p> : null}
      {error ? <p id={`${id}-error`} className="mt-1 text-sm font-medium text-pimenton-oscuro" role="alert">{error}</p> : null}
    </>
  );
}

function describedBy(id: string, error?: string, ayuda?: ReactNode) {
  return error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;
}

export function Campo({ etiqueta, error, ayuda, id, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-tinta">{etiqueta}</label>
      <input id={id} {...props} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, ayuda)} className={claseCampo} />
      <Pie id={id} error={error} ayuda={ayuda} />
    </div>
  );
}

export function AreaTexto({ etiqueta, error, ayuda, id, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-tinta">{etiqueta}</label>
      <textarea id={id} rows={2} {...props} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, ayuda)} className={claseCampo} />
      <Pie id={id} error={error} ayuda={ayuda} />
    </div>
  );
}

export function Selector({ etiqueta, error, ayuda, id, children, ...props }: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-tinta">{etiqueta}</label>
      <select id={id} {...props} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, ayuda)} className={claseCampo}>
        {children}
      </select>
      <Pie id={id} error={error} ayuda={ayuda} />
    </div>
  );
}

export function Casilla({ etiqueta, error, id, ...props }: Omit<Base, "ayuda"> & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          {...props}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-6 shrink-0 rounded-md border-tinta/30 text-pimenton accent-pimenton focus:ring-azafran-oscuro"
        />
        <label htmlFor={id} className="text-sm leading-6 text-tinta">{etiqueta}</label>
      </div>
      {error ? <p id={`${id}-error`} className="mt-1 text-sm font-medium text-pimenton-oscuro" role="alert">{error}</p> : null}
    </div>
  );
}
