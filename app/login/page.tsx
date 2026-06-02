"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      setError("Username atau password salah!");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-white to-slate-100 font-sans selection:bg-emerald-200">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/60 border border-white/80 backdrop-blur-xl shadow-2xl shadow-slate-200/50">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-600">Kamura Access</h1>
          <p className="text-sm text-slate-500 font-medium">Silakan masuk untuk mengatur bot</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-white/50 border border-slate-200 text-slate-700 shadow-inner focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition-all"
              placeholder="Masukkan username..."
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-white/50 border border-slate-200 text-slate-700 shadow-inner focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 focus:outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500 font-medium text-center bg-red-50 p-2 rounded-xl">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-bold text-white transition-all duration-300 ${
              isLoading ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-1 active:translate-y-0"
            }`}
          >
            {isLoading ? "Memeriksa..." : "Login ke Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
