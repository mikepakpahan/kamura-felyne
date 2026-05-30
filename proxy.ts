import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lindungi semua route yang diawali dengan /dashboard
  if (pathname.startsWith("/dashboard")) {
    // Kecualikan halaman login agar tidak terjadi infinite loop
    if (pathname === "/dashboard/login") return NextResponse.next();

    const session = request.cookies.get("admin_session")?.value;
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!session || session !== correctPassword) {
      return NextResponse.redirect(new URL("/dashboard/login", request.url));
    }
  }

  return NextResponse.next();
}

// Menentukan rute mana saja yang diproses middleware
export const config = {
  matcher: "/dashboard/:path*",
};
