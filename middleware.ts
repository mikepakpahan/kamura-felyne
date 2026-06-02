import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Ambil tiket masuk (cookie) dari browser
  const isLoggedIn = req.cookies.has("kamura_auth");
  const path = req.nextUrl.pathname;

  // Jika mencoba akses dashboard atau api settings tapi belum login
  if (!isLoggedIn) {
    // Alihkan paksa ke halaman login kita yang modern
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Jika sudah punya tiket, silakan lewat
  return NextResponse.next();
}

// Tentukan area mana saja yang dijaga oleh Satpam (Middleware) ini
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/settings/:path*", // Kunci juga API settings biar gak bisa ditembak orang luar
  ],
};
