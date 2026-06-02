import { useState } from "react";

interface TabProps {
  showToast: (message: string, type: "success" | "error") => void;
}

export default function AnnounceTab({ showToast }: TabProps) {
  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#00aaff");
  const [isSending, setIsSending] = useState(false);

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
        body: JSON.stringify({ channelId, title, content, color }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast(result.message, "success");
        setTitle("");
        setContent("");
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

      <div>
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2 flex justify-between">
          <span>Target Channel ID</span>
          <span className="text-[10px] normal-case font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Klik kanan channel Discord &gt; Copy ID</span>
        </label>
        <input
          type="text"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder="Contoh: 112233445566778899"
          className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 font-mono"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="md:col-span-3">
          <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Judul Pengumuman</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Update Server V2.0"
            className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
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
          className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all leading-relaxed"
        />
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleSend}
          disabled={isSending}
          className={`px-8 py-3.5 rounded-2xl font-bold text-white transition-all duration-300 flex items-center gap-2 ${
            isSending ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-1 active:translate-y-0"
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
  );
}
