import { useState, useEffect } from "react";

interface TabProps {
  showToast: (message: string, type: "success" | "error") => void;
  settings: Record<string, string>; // Tambahkan prop settings
}

export default function AnnounceTab({ showToast, settings }: TabProps) {
  const [channelId, setChannelId] = useState("");
  const [mention, setMention] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#00aaff");
  const [isSending, setIsSending] = useState(false);

  // Otomatis isi kolom dari default settings saat komponen pertama kali dirender
  useEffect(() => {
    if (settings["default_announce_channel"]) setChannelId(settings["default_announce_channel"]);
    if (settings["default_announce_mention"]) setMention(settings["default_announce_mention"]);
  }, [settings]);

  const handleSend = async () => {
    if (!channelId || !title || !content) {
      showToast("Channel ID, Judul, dan Isi Pesan wajib diisi!", "error");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, mention, title, content, color }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast(result.message, "success");
        // Kosongkan form judul & isi, TAPI kembalikan channel & mention ke setting default
        setTitle("");
        setContent("");
        setChannelId(settings["default_announce_channel"] || "");
        setMention(settings["default_announce_mention"] || "");
      } else {
        showToast(result.error || "Gagal mengirim pengumuman", "error");
      }
    } catch (error) {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
          <span>📢</span> Studio Siaran Kamura
        </h3>

        <div className="space-y-5 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2 flex justify-between">
                <span>Target Channel ID</span>
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="Contoh: 112233445566778899"
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2 flex justify-between">
                <span>Tag / Mention</span>
              </label>
              <input
                type="text"
                value={mention}
                onChange={(e) => setMention(e.target.value)}
                placeholder="Kosongkan jika tidak ada ping"
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 font-mono text-emerald-600 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="md:col-span-3">
              <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Judul Pengumuman</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Update Server V2.0"
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Warna Garis</label>
              <div className="flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 transition-all">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                <span className="text-sm font-mono text-slate-500 uppercase">{color}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Isi Pesan (Support Markdown)</label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ketik pengumuman di sini... Kamu bisa pakai **teks tebal** atau *teks miring* khas Discord."
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all leading-relaxed"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSend}
              disabled={isSending}
              className={`px-8 py-3.5 rounded-2xl font-bold text-white transition-all duration-300 flex items-center gap-2 ${
                isSending ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-1 active:translate-y-0"
              }`}
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Mengirim ke Discord...
                </>
              ) : (
                <>
                  <span>🚀</span> Siarkan Sekarang
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
