import {
  Banner,
  Button,
  Card,
  CardBody,
  CardHead,
  Chip,
  Icon,
  Well,
  type IconName,
} from "@/components/ui";

export const metadata = {
  title: "Design system · COLTRATOS",
  description:
    "Tokens, primitives, and shell components consumed by every COLTRATOS screen.",
};

const NAVY_RAMP = ["navy-950", "navy-900", "navy-800", "navy-700", "navy-600", "navy-500"] as const;
const GRAPHITE_RAMP = [
  "graphite-50",
  "graphite-100",
  "graphite-200",
  "graphite-300",
  "graphite-400",
  "graphite-500",
  "graphite-600",
  "graphite-700",
  "graphite-800",
  "graphite-900",
] as const;
const BLUE_RAMP = ["blue-50", "blue-100", "blue-200", "blue-400", "blue-500", "blue-600", "blue-700", "blue-800"] as const;
const GREEN_RAMP = ["green-50", "green-100", "green-200", "green-400", "green-500", "green-600", "green-700"] as const;
const AMBER_RAMP = ["amber-50", "amber-100", "amber-200", "amber-400", "amber-500", "amber-600", "amber-700"] as const;
const RED_RAMP = ["red-50", "red-100", "red-200", "red-400", "red-500", "red-600", "red-700"] as const;

const TINTS = [
  { tint: "blue", label: "tint-blue" },
  { tint: "green", label: "tint-green" },
  { tint: "amber", label: "tint-amber" },
  { tint: "red", label: "tint-red" },
  { tint: "violet", label: "tint-violet" },
  { tint: "sky", label: "tint-sky" },
] as const;

const ICON_NAMES: IconName[] = [
  "upload", "file", "chart", "bell", "card", "users", "settings", "search",
  "check-circle", "alert", "x-circle", "eye", "download", "filter",
  "chev-down", "chev-right", "sparkles", "shield", "clock", "plus", "x",
  "arrow-up-right", "database", "more", "logout", "globe", "trophy",
  "rocket", "build", "trend",
];

function Swatch({ token, fg = "white" }: { token: string; fg?: "white" | "ink" }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className={`bg-${token} h-16 w-full rounded-md border border-[var(--border-hairline)]`}
        aria-hidden
      />
      <div className="text-[11px] font-mono text-[var(--fg-3)] truncate">--{token}</div>
      <div className={fg === "ink" ? "text-[10px] text-[var(--fg-4)]" : "text-[10px] text-[var(--fg-4)]"}>
        Tailwind: bg-{token}
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="max-w-[1280px] mx-auto p-8 flex flex-col gap-6">
      <header>
        <h1 className="text-[30px] font-bold tracking-[-0.02em] font-display text-[var(--fg-1)] m-0">
          Design system
        </h1>
        <p className="text-[var(--fg-3)] text-sm mt-1.5 m-0">
          Tokens, primitives, and shell components consumed by every COLTRATOS screen.
          Built from the bundle vendored under <code className="font-mono text-xs bg-graphite-100 px-1 rounded">docs/design-system/source/</code>.
        </p>
      </header>

      <Banner variant="info" icon="shield">
        <strong className="text-blue-800 font-semibold">Tu archivo se analiza de forma privada y segura.</strong>{" "}
        No compartimos tu información con terceros.
      </Banner>

      {/* 1 — Anchor colors */}
      <Card>
        <CardHead title="Anchor colors" sub="Navy + graphite. Navy carries the brand on dark surfaces; graphite is the neutral ramp on light." />
        <CardBody className="grid grid-cols-6 gap-4">
          {NAVY_RAMP.map((t) => <Swatch key={t} token={t} />)}
          {GRAPHITE_RAMP.slice(0, 6).map((t) => <Swatch key={t} token={t} />)}
          {GRAPHITE_RAMP.slice(6).map((t) => <Swatch key={t} token={t} />)}
        </CardBody>
      </Card>

      {/* 2 — Primary + brand-green */}
      <Card>
        <CardHead title="Primary + brand-green" sub="Royal blue is the single CTA hue. Brand-green doubles as the logo accent and the Elegible semáforo." />
        <CardBody className="grid grid-cols-8 gap-4">
          {BLUE_RAMP.map((t) => <Swatch key={t} token={t} />)}
          {GREEN_RAMP.map((t) => <Swatch key={t} token={t} />)}
        </CardBody>
      </Card>

      {/* 3 — Semáforo */}
      <Card>
        <CardHead title="Semáforo" sub="Functional, not decorative. Always paired with a non-color affordance (icon, text, dot)." />
        <CardBody className="flex gap-12 items-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-[120px] h-[120px] rounded-full bg-green-500 flex items-center justify-center text-white shadow-[0_0_0_6px_var(--green-100)]">
              <Icon name="check-circle" size={56} />
            </div>
            <div className="text-sm font-semibold text-green-700">Elegible</div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-[120px] h-[120px] rounded-full bg-amber-500 flex items-center justify-center text-white shadow-[0_0_0_6px_var(--amber-100)]">
              <Icon name="alert" size={56} />
            </div>
            <div className="text-sm font-semibold text-amber-700">Observaciones</div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-[120px] h-[120px] rounded-full bg-red-500 flex items-center justify-center text-white shadow-[0_0_0_6px_var(--red-100)]">
              <Icon name="x-circle" size={56} />
            </div>
            <div className="text-sm font-semibold text-red-700">No elegible</div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-3 self-stretch">
            <div className="grid grid-rows-3 gap-2">
              {AMBER_RAMP.slice(0, 3).map((t) => <Swatch key={t} token={t} />)}
            </div>
            <div className="grid grid-rows-3 gap-2">
              {GREEN_RAMP.slice(0, 3).map((t) => <Swatch key={t} token={t} />)}
            </div>
            <div className="grid grid-rows-3 gap-2">
              {RED_RAMP.slice(0, 3).map((t) => <Swatch key={t} token={t} />)}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 4 — Type scale */}
      <Card>
        <CardHead title="Type scale" sub="Geist (display + UI), JetBrains Mono (IDs / numbers). Tight tracking on displays." />
        <CardBody className="flex flex-col gap-4">
          <div className="font-display font-extrabold text-[56px] leading-[1.05] tracking-[-0.035em]">
            Sabe en 1 minuto
          </div>
          <div className="font-display font-extrabold text-[44px] leading-[1.08] tracking-[-0.03em]">
            Display LG · 44/1.08
          </div>
          <div className="font-display font-bold text-[30px] tracking-[-0.02em]">H1 · 30/1.1</div>
          <div className="font-display font-semibold text-[24px] tracking-[-0.015em]">H2 · 24/1.25</div>
          <div className="font-display font-semibold text-[20px]">H3 · 20/1.25</div>
          <div className="text-[16px] text-[var(--fg-2)]">Body LG · 16/1.5 — “Aquí tienes el resumen de tu actividad.”</div>
          <div className="text-[14px] text-[var(--fg-2)]">Body · 14/1.5 — Default body text size.</div>
          <div className="text-[13px] text-[var(--fg-3)]">Sm · 13/1.5 — captions, table secondary fields.</div>
          <div className="text-[12px] text-[var(--fg-3)] uppercase tracking-[0.08em] font-semibold">Eyebrow · 12 caps</div>
          <div className="font-mono text-[14px] bg-graphite-100 px-2 py-1 rounded inline-block w-fit">
            LP-2024-0025 · 1.87 MB · 48 seg
          </div>
        </CardBody>
      </Card>

      {/* 5 — Spacing / radii / shadow */}
      <Card>
        <CardHead title="Spacing · radii · shadow" sub="4-pt scale; cards at 12 px; pills fully rounded; shadows low and airy." />
        <CardBody className="flex flex-col gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--fg-3)] mb-2">Spacing</div>
            <div className="flex items-end gap-2">
              {[4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80].map((px) => (
                <div key={px} className="flex flex-col items-center gap-1">
                  <div className="bg-blue-200" style={{ width: px, height: 24 }} />
                  <span className="text-[11px] text-[var(--fg-3)] font-mono">{px}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--fg-3)] mb-2">Radii</div>
            <div className="flex gap-3">
              {[
                { r: 4, t: "xs" }, { r: 6, t: "sm" }, { r: 8, t: "md" },
                { r: 12, t: "lg" }, { r: 16, t: "xl" }, { r: 20, t: "2xl" },
              ].map((x) => (
                <div key={x.t} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 bg-graphite-200 border border-[var(--border-default)]" style={{ borderRadius: x.r }} />
                  <span className="text-[11px] text-[var(--fg-3)] font-mono">{x.t}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--fg-3)] mb-2">Shadow</div>
            <div className="flex gap-4">
              {[
                { s: "var(--shadow-xs)", t: "xs" },
                { s: "var(--shadow-sm)", t: "sm" },
                { s: "var(--shadow-md)", t: "md" },
                { s: "var(--shadow-lg)", t: "lg" },
                { s: "var(--shadow-xl)", t: "xl" },
              ].map((x) => (
                <div key={x.t} className="flex flex-col items-center gap-1">
                  <div className="w-20 h-16 bg-white rounded-lg border border-[var(--border-hairline)]" style={{ boxShadow: x.s }} />
                  <span className="text-[11px] text-[var(--fg-3)] font-mono">{x.t}</span>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 6 — Buttons + chips */}
      <Card>
        <CardHead title="Buttons + chips" />
        <CardBody className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" leadingIcon="plus">Subir pliego</Button>
            <Button variant="secondary" leadingIcon="download">Descargar</Button>
            <Button variant="ghost" trailingIcon="arrow-up-right">Ver detalle</Button>
            <Button variant="success" leadingIcon="check-circle">Confirmar</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="primary" size="sm">Sm</Button>
            <Button variant="primary" size="md">Md</Button>
            <Button variant="primary" size="lg">Lg</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip variant="green">Elegible</Chip>
            <Chip variant="amber">Observaciones</Chip>
            <Chip variant="red">No elegible</Chip>
            <Chip variant="blue">En proceso</Chip>
            <Chip variant="violet">Pendiente</Chip>
            <Chip variant="gray">Borrador</Chip>
            <Chip variant="green" dot={false}>Sin punto</Chip>
          </div>
        </CardBody>
      </Card>

      {/* 7 — Forms */}
      <Card>
        <CardHead title="Form inputs" sub="Primitive form components ship with downstream FE specs; placeholder shapes shown here." />
        <CardBody className="flex flex-col gap-3 max-w-md">
          <input
            className="w-full px-3.5 py-2.5 border border-[var(--border-default)] rounded-md bg-white text-sm focus-visible:outline-none focus-visible:border-blue-600 focus-visible:shadow-[var(--shadow-focus)]"
            placeholder="Razón social de la empresa"
            aria-label="Razón social"
          />
          <select
            className="w-full px-3.5 py-2.5 border border-[var(--border-default)] rounded-md bg-white text-sm"
            aria-label="Categoría UNSPSC"
            defaultValue=""
          >
            <option value="" disabled>Categoría UNSPSC</option>
            <option value="72">Servicios de construcción y mantenimiento</option>
            <option value="81">Servicios de ingeniería</option>
          </select>
          <textarea
            className="w-full px-3.5 py-2.5 border border-[var(--border-default)] rounded-md bg-white text-sm min-h-[88px]"
            placeholder="Notas internas sobre el pliego (opcional)"
            aria-label="Notas"
          />
        </CardBody>
      </Card>

      {/* 8 — KPI card */}
      <Card>
        <CardHead title="KPI card" />
        <CardBody className="grid grid-cols-4 gap-4">
          {([
            { tint: "blue" as const, icon: "chart" as IconName, num: "147", lbl: "Análisis realizados" },
            { tint: "green" as const, icon: "check-circle" as IconName, num: "70%", lbl: "Tasa de elegibilidad" },
            { tint: "amber" as const, icon: "card" as IconName, num: "23", lbl: "Créditos restantes" },
            { tint: "violet" as const, icon: "clock" as IconName, num: "112 h", lbl: "Ahorro de tiempo" },
          ]).map((k) => (
            <div key={k.lbl} className="bg-white border border-[var(--border-hairline)] rounded-lg shadow-[var(--shadow-sm)] p-5">
              <div className="flex items-start justify-between mb-4">
                <Well tint={k.tint}>
                  <Icon name={k.icon} size={20} />
                </Well>
                <Chip variant="green">+12%</Chip>
              </div>
              <div className="font-display font-bold text-[32px] tracking-[-0.02em] leading-[1.1]">{k.num}</div>
              <div className="text-sm text-[var(--fg-3)] mt-1">{k.lbl}</div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* 9 — Logo */}
      <Card>
        <CardHead title="Logo" sub="Mark + lockup. ⚠️ Reverse-engineered from raster mocks; replace when authoritative SVG arrives." />
        <CardBody className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-[var(--border-hairline)] rounded-lg p-8 flex items-center justify-center min-h-[120px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/coltratos-lockup.svg" alt="COLTRATOS lockup on light" style={{ filter: "brightness(0)" }} className="h-12" />
          </div>
          <div className="bg-navy-900 rounded-lg p-8 flex items-center justify-center min-h-[120px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/coltratos-lockup.svg" alt="COLTRATOS lockup on navy" className="h-12" />
          </div>
        </CardBody>
      </Card>

      {/* 10 — Iconography */}
      <Card>
        <CardHead title="Iconography" sub="28 inline SVG paths. No external icon library (ADR-018). Add new icons by appending to the registry in src/components/ui/icon.tsx." />
        <CardBody className="flex flex-col gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--fg-3)] mb-3">Icon set</div>
            <div className="grid grid-cols-10 gap-3">
              {ICON_NAMES.map((n) => (
                <div key={n} className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-md border border-[var(--border-hairline)] flex items-center justify-center text-graphite-700">
                    <Icon name={n} size={18} />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--fg-3)] truncate w-full text-center">{n}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--fg-3)] mb-3">Tinted wells</div>
            <div className="flex gap-4">
              {TINTS.map((t) => (
                <div key={t.tint} className="flex flex-col items-center gap-1">
                  <Well tint={t.tint}>
                    <Icon name="sparkles" size={20} />
                  </Well>
                  <span className="text-[11px] font-mono text-[var(--fg-3)]">--{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
