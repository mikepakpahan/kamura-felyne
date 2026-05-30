import { SignJWT, importPKCS8 } from "jose";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getGoogleToken() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL!;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY!;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  privateKey = privateKey.replace(/\\n/g, "\n");

  const alg = "RS256";
  const pkcs8 = await importPKCS8(privateKey, alg);
  const jwt = await new SignJWT({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
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

export default async function PublicHomePage() {
  const rows = await getBuilds();
  const builds = rows.slice(1).reverse();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      {/* Navbar Publik */}
      <nav className="max-w-7xl mx-auto mb-8 flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Kamura<span className="text-emerald-600">Felyne</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Public Armory</p>
        </div>
      </nav>

      {/* Konten Utama */}
      <main className="max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-800">Koleksi Build Hunter</h2>
            <p className="text-slate-500 text-sm">Temukan inspirasi set armor dari para hunter di server kita.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {builds.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 italic">Belum ada build yang dibagikan.</div>
            ) : (
              builds.map((build: string[], index: number) => {
                // MENGGUNAKAN IDE BRILIANMU UNTUK URL GAMECAT
                const gamecatUrl = `https://gamecat.fun/e/#${build[2]}`;

                return (
                  <div key={index} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                          {build[1]} {/* Jenis Senjata */}
                        </span>
                        <span className="text-xs font-bold text-slate-400">@{build[4]}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{build[0]}</h3>
                      <p className="text-sm text-slate-500 mb-6 line-clamp-3">{build[3] !== "-" ? build[3] : "Tidak ada catatan tambahan untuk build ini."}</p>
                    </div>

                    {/* TOMBOL AJAIB 1-CLICK IMPORT */}
                    <Link href={gamecatUrl} target="_blank" className="w-full text-center bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl transition-all text-sm">
                      Buka di GameCat
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
