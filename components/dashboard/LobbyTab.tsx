interface TabProps {
  settings: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}

export default function LobbyTab({ settings, handleChange }: TabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Lobby Create Content & Title */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Pesan Notifikasi Lobi</label>
          <p className="text-[11px] text-slate-400 mb-3">Variabel: {"{mention}"}</p>
          <textarea
            rows={2}
            value={settings["msg_lobby_create_content"] || ""}
            onChange={(e) => handleChange("msg_lobby_create_content", e.target.value)}
            className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
          />
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Judul Embed Lobi</label>
          <p className="text-[11px] text-transparent mb-3 select-none">-</p> {/* Spacer */}
          <textarea
            rows={2}
            value={settings["msg_lobby_create_title"] || ""}
            onChange={(e) => handleChange("msg_lobby_create_title", e.target.value)}
            className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
          />
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Deskripsi Embed Lobi</label>
        <p className="text-[11px] text-slate-400 mb-3">Variabel: {"{username}"}</p>
        <textarea
          rows={2}
          value={settings["msg_lobby_create_desc"] || ""}
          onChange={(e) => handleChange("msg_lobby_create_desc", e.target.value)}
          className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
        />
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Footer / Catatan Bawah Lobi</label>
        <input
          type="text"
          value={settings["msg_lobby_footer"] || ""}
          onChange={(e) => handleChange("msg_lobby_footer", e.target.value)}
          className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
        />
      </div>

      {/* Error & Empty Messages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Pesan Lobi Kosong</label>
          <textarea
            rows={3}
            value={settings["msg_lobby_empty"] || ""}
            onChange={(e) => handleChange("msg_lobby_empty", e.target.value)}
            className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none text-red-600"
          />
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Pesan Error (Lobi Masih Aktif)</label>
          <textarea
            rows={3}
            value={settings["msg_lobby_active_error"] || ""}
            onChange={(e) => handleChange("msg_lobby_active_error", e.target.value)}
            className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none text-orange-600"
          />
        </div>
      </div>
    </div>
  );
}
