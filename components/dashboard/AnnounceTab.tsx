import { useState, useEffect } from "react";

interface TabProps {
  showToast: (message: string, type: "success" | "error") => void;
  settings: Record<string, string>;
}

export default function AnnounceTab({ showToast, settings }: TabProps) {
  const [useEmbed, setUseEmbed] = useState(true);
  const [channelId, setChannelId] = useState("");
  const [outerMessage, setOuterMessage] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#00fa9a");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (settings["default_announce_channel"]) {
      setChannelId(settings["default_announce_channel"]);
    }

    if (settings["default_announce_mention"]) {
      setOuterMessage(settings["default_announce_mention"]);
    }
  }, [settings]);

  const handleSend = async () => {
    if (!channelId || !content) {
      showToast("Channel ID dan Isi Pesan wajib diisi!", "error");
      return;
    }

    if (useEmbed && !title) {
      showToast("Judul wajib diisi untuk format Embed!", "error");
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch("/api/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, useEmbed, outerMessage, title, content, color }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast(result.message, "success");
        setTitle("");
        setContent("");
        setChannelId(settings["default_announce_channel"] || "");
        setOuterMessage(settings["default_announce_mention"] || "");
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
    <div className="space-y-5 relative z-10">
      <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
        <span>📢</span> Studio Siaran Kamura
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
        <div>
          <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Target Channel ID</label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="Contoh: 112233445566778899"
            className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Format Pesan</label>
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
            <button onClick={() => setUseEmbed(false)} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${!useEmbed ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
              📝 Biasa
            </button>
            <button onClick={() => setUseEmbed(true)} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${useEmbed ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
              ✨ Embed
            </button>
          </div>
        </div>
      </div>

      {useEmbed && (
        <div className="space-y-5 border-t border-slate-100 pt-5 mt-2 animate-in fade-in slide-in-from-top-2">
          <div>
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Teks Luar Embed (Opsional)</label>
            <textarea
              rows={3}
              value={outerMessage}
              onChange={(e) => setOuterMessage(e.target.value)}
              placeholder="Bisa diisi @everyone, sapaan, atau dibiarkan kosong...\n(Bisa tekan Enter untuk baris baru)"
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-emerald-700 font-medium leading-relaxed resize-y"
            />
            <p className="text-xs text-slate-400 mt-1.5">Teks ini akan muncul di atas kotak warna. Bebas diisi apa saja.</p>
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
        </div>
      )}

      <div className={`${!useEmbed ? "border-t border-slate-100 pt-5 mt-2" : ""}`}>
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">{useEmbed ? "Isi Pesan Dalam Kotak (Support Markdown)" : "Isi Pesan Lengkap (Support Markdown)"}</label>
        <textarea
          rows={useEmbed ? 6 : 8}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={useEmbed ? "Ketik pengumuman di sini..." : "Ketik pengumuman biasa di sini... Kalau mau ngetag @everyone, ketik saja langsung di dalam sini."}
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
              Mengirim...
            </>
          ) : (
            <>
              <span>🚀</span> Siarkan Sekarang
            </>
          )}
        </button>
      </div>
    </div>
  );
}
