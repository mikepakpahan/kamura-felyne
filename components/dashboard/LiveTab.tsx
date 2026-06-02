interface TabProps {
  settings: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}

export default function LiveTab({ settings, handleChange }: TabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Pesan Notifikasi Live (Luar Embed)</label>
        <p className="text-xs text-slate-400 mb-3">Variabel: {"{mention}"}</p>
        <input
          type="text"
          value={settings["msg_live_content"] || ""}
          onChange={(e) => handleChange("msg_live_content", e.target.value)}
          className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
        />
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Judul Embed Live</label>
        <p className="text-xs text-slate-400 mb-3">Variabel: {"{emoji}, {username}, {platform}"}</p>
        <input
          type="text"
          value={settings["msg_live_title"] || ""}
          onChange={(e) => handleChange("msg_live_title", e.target.value)}
          className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
        />
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Format Deskripsi Live</label>
        <p className="text-xs text-slate-400 mb-3">Variabel: {"{pesan}, {url}"}</p>
        <textarea
          rows={5}
          value={settings["msg_live_desc"] || ""}
          onChange={(e) => handleChange("msg_live_desc", e.target.value)}
          className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}
