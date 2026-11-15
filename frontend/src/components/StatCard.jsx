/**
 * StatCard – one of the four top-line metric cards.
 * Props:
 *  - label  {string}
 *  - value  {string | number}
 *  - unit   {string | null}
 *  - icon   {React component}  – Lucide icon
 *  - accent {string}           – Tailwind background colour class for the icon chip
 */
export default function StatCard({ label, value, unit, icon: Icon, accent }) {
  return (
    <article className="flex min-h-[118px] items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.04em] text-slate-900">
          {value}
          {unit && <span className="ml-1.5 text-sm font-medium tracking-normal text-slate-500">{unit}</span>}
        </p>
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
    </article>
  );
}
