"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GlobalTab from "@/components/dashboard/GlobalTab";
import LobbyTab from "@/components/dashboard/LobbyTab";
import LiveTab from "@/components/dashboard/LiveTab";
import BuildTab from "@/components/dashboard/BuildTab";
import AnnounceTab from "@/components/dashboard/AnnounceTab";

export default function Dashboard() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("global");

  // State baru untuk mengontrol menu Sidebar di HP
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const router = useRouter();

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => {
        if (res.status === 401) router.push("/login");
        return res.json();
      })
      .then((data) => {
        if (data.success) setSettings(data.data);
        setIsLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast(result.message || "Pengaturan berhasil disimpan!", "success");
      } else {
        showToast(result.error || "Gagal menyimpan pengaturan!", "error");
      }
    } catch (error) {
      showToast("Terjadi kesalahan jaringan!", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "kamura_auth=; path=/; max-age=0;";
    router.push("/login");
  };

  const menuItems = [
    { id: "global", label: "Global Config", icon: "🌐" },
    { id: "lobby", label: "Sesi Lobby", icon: "⚔️" },
    { id: "live", label: "Share Live", icon: "🔴" },
    { id: "build", label: "Build Armorset", icon: "🛡️" },
    { id: "announce", label: "Pengumuman", icon: "📢" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium">Memuat konfigurasi Kamura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans selection:bg-emerald-200 relative overflow-hidden">
      {/* ================= BACKDROP OVERLAY (KHUSUS HP) ================= */}
      {/* Latar belakang gelap berbayang saat menu samping terbuka di HP */}
      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />}

      {/* ================= SIDEBAR (RESPONSIVE) ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col shadow-2xl md:shadow-[4px_0_24px_rgba(0,0,0,0.02)] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-8 pb-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-600">Kamura Panel</h1>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">Bot Control System</p>
          </div>

          {/* Tombol Tutup Sidebar (Hanya muncul di HP) */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600 p-2 bg-slate-50 rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false); // Otomatis tutup sidebar saat menu diklik di HP
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 ${
                activeTab === item.id ? "bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        {/* ================= RESPONSIVE HEADER ================= */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 md:py-5 flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center gap-3 md:gap-0">
            {/* Tombol Hamburger (Muncul di HP untuk memanggil Sidebar) */}
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2.5 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
              </svg>
            </button>

            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-700 flex items-center gap-2">
                <span className="hidden md:inline">{menuItems.find((m) => m.id === activeTab)?.icon}</span>
                {menuItems.find((m) => m.id === activeTab)?.label}
              </h2>
              <p className="text-xs md:text-sm text-slate-500 hidden sm:block">Sesuaikan respons bot untuk fitur ini.</p>
            </div>
          </div>

          {/* Tombol Save (Responsif: Teks disembunyikan di layar sangat kecil) */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 md:px-6 py-2.5 rounded-xl font-bold text-white transition-all shadow-md flex items-center gap-2 text-sm md:text-base ${
              isSaving ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:shadow-cyan-500/30 hover:-translate-y-0.5 active:translate-y-0"
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Menyimpan...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span className="hidden sm:inline">Simpan Perubahan</span>
                <span className="sm:hidden">Simpan</span> {/* Teks pendek khusus HP */}
              </>
            )}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100/50">
          <div className="max-w-3xl pb-20">
            {activeTab === "global" && <GlobalTab settings={settings} handleChange={handleChange} />}
            {activeTab === "lobby" && <LobbyTab settings={settings} handleChange={handleChange} />}
            {activeTab === "live" && <LiveTab settings={settings} handleChange={handleChange} />}
            {activeTab === "build" && <BuildTab settings={settings} handleChange={handleChange} />}
            {activeTab === "announce" && <AnnounceTab showToast={showToast} />}
          </div>
        </div>
      </main>

      {/* ================= TOAST NOTIFICATION ================= */}
      {toast.show && (
        <div
          className={`fixed bottom-6 md:bottom-8 right-1/2 translate-x-1/2 md:translate-x-0 md:right-8 z-50 flex items-center gap-3 px-5 md:px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-bottom-8 fade-in duration-300 w-11/12 md:w-auto max-w-sm ${
            toast.type === "success" ? "bg-emerald-50/90 border-emerald-200 text-emerald-800 shadow-emerald-500/20" : "bg-red-50/90 border-red-200 text-red-800 shadow-red-500/20"
          }`}
        >
          <span className="text-xl md:text-2xl drop-shadow-sm">{toast.type === "success" ? "✨" : "⚠️"}</span>
          <div>
            <h4 className="font-bold text-sm md:text-base">{toast.type === "success" ? "Berhasil!" : "Terjadi Kesalahan"}</h4>
            <p className="text-xs md:text-sm opacity-90 mt-0.5">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
