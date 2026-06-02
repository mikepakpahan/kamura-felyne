interface TabProps {
  settings: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}

export default function GlobalTab({ settings, handleChange }: TabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Pengaturan Website */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">URL Website Kamura</label>
        <input
          type="text"
          value={settings["url_kamura_web"] || ""}
          onChange={(e) => handleChange("url_kamura_web", e.target.value)}
          className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
        />
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">URL Website GameCat</label>
        <input
          type="text"
          value={settings["url_gamecat"] || ""}
          onChange={(e) => handleChange("url_gamecat", e.target.value)}
          className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
        />
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Role Target Mention (Lobby)</label>
        <p className="text-xs text-slate-400 mb-3">Contoh: @here, @everyone, atau &lt;@&amp;ID_ROLE&gt;</p>
        <input
          type="text"
          value={settings["role_mention"] || ""}
          onChange={(e) => handleChange("role_mention", e.target.value)}
          className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
        />
      </div>

      {/* Pengaturan Default Pengumuman Baru */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Default Fitur Pengumuman</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Default Channel ID</label>
            <input
              type="text"
              value={settings["default_announce_channel"] || ""}
              onChange={(e) => handleChange("default_announce_channel", e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              placeholder="112233445566778899"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Default Mention</label>
            <input
              type="text"
              value={settings["default_announce_mention"] || ""}
              onChange={(e) => handleChange("default_announce_mention", e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              placeholder="@everyone"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
