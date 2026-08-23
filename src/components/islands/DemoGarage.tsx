// React 19 removed the global JSX namespace; it is imported from 'react' now.
import { useState, type JSX } from 'react'

/* ───────────────────────────────────────────────────────────────────────────
 * Demo fixtures. Entirely fictional and labelled as such in the UI.
 *
 * Workshop names are deliberately invented. The earlier draft used what read as
 * real Singapore businesses (Moto Plaza, TC Bros, Speed Machine) alongside
 * invented star ratings and review counts — attaching made-up ratings to real
 * named businesses is a defamation and advertising-standards risk, and the
 * Claim Guardrails forbid unverified ratings outright. Ratings and review
 * counts are gone; the demo shows browsing and contact only.
 * ────────────────────────────────────────────────────────────────────────── */

const BIKE = { plate: 'SGX1234A', model: 'Honda CB400', year: 2021 }

const DOCS = [
  { label: 'Road tax', status: 'urgent' as const, days: 21, date: '2 Sep 2026' },
  { label: 'Insurance', status: 'ok' as const, days: 87, date: '6 Nov 2026' },
  { label: 'COE', status: 'ok' as const, days: 312, date: '19 Jun 2027' },
  { label: 'Servicing', status: 'warn' as const, days: 44, date: '25 Sep 2026' },
]

const FUEL_LOG = [
  { date: '10 Aug', station: 'Bishan', litres: 9.2, cost: 26.19, odo: 14321 },
  { date: '27 Jul', station: 'Ang Mo Kio', litres: 10.1, cost: 28.49, odo: 14094 },
  { date: '14 Jul', station: 'Yishun', litres: 8.7, cost: 24.84, odo: 13871 },
  { date: '01 Jul', station: 'Bishan', litres: 9.6, cost: 27.26, odo: 13658 },
  { date: '18 Jun', station: 'Bishan', litres: 9.8, cost: 27.83, odo: 13441 },
]

const SERVICE_LOG = [
  { date: '14 Mar 2026', workshop: 'Northside Moto', job: 'Engine oil change', cost: 68 },
  { date: '19 Nov 2025', workshop: 'Central Bike Care', job: 'Brake pads + chain lube', cost: 112 },
  { date: '3 Jul 2025', workshop: 'Eastline Garage', job: '12,000 km full service', cost: 185 },
]

const WORKSHOPS = [
  { name: 'Northside Moto', area: 'Yishun', dist: '1.2 km', tags: ['Servicing', 'Tyres', 'Brakes'] },
  { name: 'Central Bike Care', area: 'Bishan', dist: '3.4 km', tags: ['Servicing', 'Chain', 'Oil'] },
  { name: 'Eastline Garage', area: 'Ang Mo Kio', dist: '4.1 km', tags: ['Full service', 'Diagnostics'] },
]

const EXPENSES = [
  { date: '10 Aug', cat: 'Fuel', desc: 'Bishan fill-up', amount: 26.19 },
  { date: '27 Jul', cat: 'Fuel', desc: 'Ang Mo Kio fill-up', amount: 28.49 },
  { date: '14 Mar', cat: 'Service', desc: 'Oil change', amount: 68.0 },
  { date: '01 Mar', cat: 'Insurance', desc: 'Annual premium', amount: 640.0 },
  { date: '10 Feb', cat: 'Road tax', desc: 'LTA renewal', amount: 242.0 },
]

type Tab = 'home' | 'fuel' | 'service' | 'workshops' | 'expenses'

/* ── shared bits ─────────────────────────────────────────────────────────── */

const STATUS: Record<string, { cls: string; label: (d: number) => string }> = {
  urgent: { cls: 'bg-rose text-red', label: (d) => `${d}d · renew soon` },
  warn: { cls: 'bg-amber-100 text-amber-800', label: (d) => `${d}d · due soon` },
  ok: { cls: 'bg-emerald-100 text-emerald-800', label: (d) => `${d}d left` },
}

function StatusPill({ status, days }: { status: string; days: number }) {
  const s = STATUS[status]
  return (
    <span className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-bold ${s.cls}`}>
      {s.label(days)}
    </span>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <p className="eyebrow mb-3 text-red">{children}</p>
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-ink/10 bg-paper p-4 ${className}`}>{children}</div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-rose px-3 py-2.5">
      <p className="text-[0.5625rem] font-bold uppercase tracking-[0.15em] text-red">{label}</p>
      <p className="mt-1 font-display text-lg leading-none font-700 text-ink">{value}</p>
    </div>
  )
}

/* ── screens ─────────────────────────────────────────────────────────────── */

function HomeScreen() {
  return (
    <div>
      <div className="-mx-4 -mt-4 mb-5 bg-black px-4 pb-6 pt-5">
        <p className="eyebrow text-white/40">Demo garage</p>
        <p className="mt-1.5 font-display text-2xl leading-tight font-700 text-paper">
          {BIKE.model}
        </p>
        <p className="text-xs text-white/45">
          {BIKE.plate} · {BIKE.year}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {[
            ['Mileage', '14,321 km'],
            ['Monthly cost', '$148'],
            ['Efficiency', '29.4 km/L'],
            ['Last service', '14 Mar'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/6 px-3 py-2.5">
              <p className="text-[0.5625rem] uppercase tracking-[0.1em] text-white/35">{k}</p>
              <p className="mt-0.5 text-md font-bold text-paper">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <SectionLabel>Documents</SectionLabel>
      <div className="mb-6 flex flex-col gap-2.5">
        {DOCS.map((doc) => (
          <Card key={doc.label} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink">{doc.label}</p>
              <p className="text-xs text-muted">Expires {doc.date}</p>
            </div>
            <StatusPill status={doc.status} days={doc.days} />
          </Card>
        ))}
      </div>

      <SectionLabel>Quick add</SectionLabel>
      <div className="grid grid-cols-2 gap-2.5">
        {['Log fill-up', 'Log service', 'Add expense', 'View history'].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-ink/10 bg-rose px-3 py-4 text-sm font-semibold text-ink"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

function FuelScreen() {
  const trend = [27.1, 28.4, 29.2, 30.1, 29.4]
  const labels = ['Jun', 'Jul', 'Jul', 'Aug', 'Aug']

  return (
    <div>
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <Kpi label="Efficiency" value="29.4" />
        <Kpi label="Per km" value="$0.10" />
        <Kpi label="This month" value="$54" />
      </div>

      <div className="mb-6 rounded-2xl bg-soft p-4">
        <p className="eyebrow mb-3 text-muted">Efficiency trend (km/L)</p>
        <div className="flex h-16 items-end gap-1.5">
          {trend.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded ${i === trend.length - 1 ? 'bg-red' : 'bg-ink/15'}`}
                style={{ height: `${((v - 26) / 5) * 60}px` }}
              />
              <span className="text-[0.5625rem] text-muted">{labels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <SectionLabel>Fill-up history</SectionLabel>
      <div className="flex flex-col gap-2">
        {FUEL_LOG.map((f, i) => (
          <Card key={i} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">{f.station}</p>
              <p className="text-xs text-muted">
                {f.date} · {f.litres} L · {f.odo.toLocaleString()} km
              </p>
            </div>
            <p className="font-display text-lg font-700 text-ink">${f.cost.toFixed(2)}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ServiceScreen() {
  return (
    <div>
      <div className="mb-5 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <div>
          <p className="text-sm font-bold text-amber-900">Service due in 44 days</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Based on your last service on 14 Mar 2026.
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2.5">
        <Kpi label="Total spent" value="$365" />
        <Kpi label="Services" value="3" />
        <Kpi label="Last workshop" value="Northside" />
        <Kpi label="Next due" value="25 Sep" />
      </div>

      <SectionLabel>Service history</SectionLabel>
      <div className="flex flex-col gap-2">
        {SERVICE_LOG.map((s, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-ink">{s.job}</p>
              <p className="font-display text-lg font-700 text-ink">${s.cost}</p>
            </div>
            <p className="mt-1 text-xs text-muted">
              {s.date} · {s.workshop}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function WorkshopsScreen() {
  return (
    <div>
      <div className="mb-4 rounded-xl border border-ink/10 bg-soft px-4 py-3 text-sm text-muted">
        Search workshops in Singapore…
      </div>

      <SectionLabel>Nearby workshops</SectionLabel>
      <div className="flex flex-col gap-3">
        {WORKSHOPS.map((ws) => (
          <Card key={ws.name}>
            <p className="text-md font-bold text-ink">{ws.name}</p>
            <p className="text-xs text-muted">
              {ws.area} · {ws.dist}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {ws.tags.map((tag) => (
                <span key={tag} className="rounded-pill bg-soft px-2.5 py-1 text-xs text-ink/70">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-3 border-t border-ink/8 pt-3 text-sm font-semibold text-red">
              View details
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ExpensesScreen() {
  const total = EXPENSES.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div>
      <div className="mb-5 rounded-2xl bg-black p-5">
        <p className="eyebrow text-white/40">Recorded this year</p>
        <p className="mt-2 font-display text-display-sm leading-none font-700 text-paper">
          ${total.toFixed(2)}
        </p>
      </div>

      <SectionLabel>Recent expenses</SectionLabel>
      <div className="flex flex-col gap-2">
        {EXPENSES.map((e, i) => (
          <Card key={i} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">{e.desc}</p>
              <p className="text-xs text-muted">
                {e.date} · {e.cat}
              </p>
            </div>
            <p className="font-display text-lg font-700 text-ink">${e.amount.toFixed(2)}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ── shell ───────────────────────────────────────────────────────────────── */

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'service', label: 'Service' },
  { id: 'workshops', label: 'Shops' },
  { id: 'expenses', label: 'Costs' },
]

export default function DemoGarage() {
  const [tab, setTab] = useState<Tab>('home')

  const screens: Record<Tab, JSX.Element> = {
    home: <HomeScreen />,
    fuel: <FuelScreen />,
    service: <ServiceScreen />,
    workshops: <WorkshopsScreen />,
    expenses: <ExpensesScreen />,
  }

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border border-ink/12 bg-paper shadow-[0_24px_64px_rgba(8,8,8,0.18)]">
      <div className="h-[34rem] overflow-y-auto p-4">
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {screens[tab]}
        </div>
      </div>

      <div role="tablist" aria-label="Demo screens" className="flex border-t border-ink/10 bg-black">
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-1 py-3 text-xs font-semibold transition-colors ${
                active ? 'text-ember-on-dark' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
