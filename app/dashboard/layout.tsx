export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <nav className="max-w-7xl mx-auto mb-8 flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Kamura<span className="text-emerald-600">Felyne</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Admin Panel</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black border border-emerald-100 uppercase">Admin Mode</div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
