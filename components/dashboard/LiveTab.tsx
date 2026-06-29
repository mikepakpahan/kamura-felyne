interface TabProps {
  settings: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}

export default function LiveTab({ settings, handleChange }: TabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Tombol Switch Format */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Format Notifikasi Live</h3>
            <p className="text-sm text-slate-500 mt-1">Pilih apakah ingin menggunakan kotak Embed atau sekadar teks biasa.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" className="sr-only peer" checked={settings["share_live_format"] === "text"} onChange={(e) => handleChange("share_live_format", e.target.checked ? "text" : "embed")} />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
            <span className="ml-3 text-sm font-extrabold w-28 transition-colors duration-300 peer-checked:text-emerald-600 text-slate-500">{settings["share_live_format"] === "text" ? "Teks Biasa" : "Pakai Embed"}</span>
          </label>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Pesan Notifikasi Live (Luar Embed)</label>
        <p className="text-xs text-slate-400 mb-3">Variabel: {"{emoji}, {username}, {user}, {platform}, {mention}"}</p>
        <textarea
          rows={5}
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
