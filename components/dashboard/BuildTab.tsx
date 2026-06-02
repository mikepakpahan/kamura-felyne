interface TabProps {
  settings: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}

export default function BuildTab({ settings, handleChange }: TabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* GameCat Builder Settings */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Setingan GameCat Builder</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Judul Embed</label>
            <input
              type="text"
              value={settings["msg_builder_title"] || ""}
              onChange={(e) => handleChange("msg_builder_title", e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Deskripsi Embed</label>
            <textarea
              rows={2}
              value={settings["msg_builder_desc"] || ""}
              onChange={(e) => handleChange("msg_builder_desc", e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Database Kamura Settings */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Setingan Database Kamura</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Judul Embed List Build</label>
            <input
              type="text"
              value={settings["msg_listbuild_title"] || ""}
              onChange={(e) => handleChange("msg_listbuild_title", e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Deskripsi Embed List Build</label>
            <textarea
              rows={3}
              value={settings["msg_listbuild_desc"] || ""}
              onChange={(e) => handleChange("msg_listbuild_desc", e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
