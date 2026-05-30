import { SignJWT, importPKCS8 } from "jose";

// Fitur anti-cache agar tabel selalu menampilkan data terbaru setiap di-refresh
export const dynamic = "force-dynamic";

// --- HELPER UNTUK AMBIL DATA ---
async function getGoogleToken() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL!;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY!;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  privateKey = privateKey.replace(/\\n/g, "\n");

  const alg = "RS256";
  const pkcs8 = await importPKCS8(privateKey, alg);
  const jwt = await new SignJWT({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly", // Readonly agar lebih aman
    aud: "https://oauth2.googleapis.com/token",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg, typ: "JWT" })
    .sign(pkcs8);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await res.json();
  return data.access_token;
}

async function getBuilds() {
  const sheetId = process.env.SPREADSHEET_ID!;
  const token = await getGoogleToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:E`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.values || [];
}
// ---------------------------------

export default async function DashboardPage() {
  const rows = await getBuilds();
  // Hilangkan header tabel (baris pertama) dan balik urutannya agar yang terbaru di atas
  const builds = rows.slice(1).reverse();

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Daftar Build Senjata</h2>
          <p className="text-slate-500 text-sm">Kelola semua build yang masuk dari Discord</p>
        </div>
        <div className="bg-slate-100 text-slate-600 px-4 py-2 rounded-2xl text-sm font-bold border border-slate-200">Total: {builds.length} Build</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-100">
              <th className="pb-4 px-4 font-black">Nama Build</th>
              <th className="pb-4 px-4 font-black">Senjata</th>
              <th className="pb-4 px-4 font-black">Creator</th>
              <th className="pb-4 px-4 font-black">Encoding</th>
              <th className="pb-4 px-4 font-black text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {builds.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-20 text-slate-400 font-medium italic">
                  Belum ada data build terkini.
                </td>
              </tr>
            ) : (
              builds.map((build: string[], index: number) => (
                <tr key={index} className="group hover:bg-slate-50/50 transition-all">
                  <td className="py-5 px-4 font-bold text-slate-800">{build[0]}</td>
                  <td className="py-5 px-4">
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">{build[1]}</span>
                  </td>
                  <td className="py-5 px-4 text-slate-500 text-sm font-medium">@{build[4]}</td>
                  <td className="py-5 px-4">
                    <div className="text-[10px] font-mono bg-slate-50 p-2 rounded-xl border border-slate-200 truncate max-w-[200px] text-slate-500">{build[2]}</div>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <button className="opacity-0 group-hover:opacity-100 transition-all text-[10px] bg-red-50 hover:bg-red-500 hover:text-white text-red-600 px-4 py-2 rounded-xl font-black border border-red-100 uppercase tracking-tighter">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
