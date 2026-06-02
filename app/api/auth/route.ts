import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const validUser = process.env.ADMIN_USER || "admin";
    const validPass = process.env.ADMIN_PASS || "rahasia123";

    if (username === validUser && password === validPass) {
      // Jika login sukses, buat response berhasil
      const response = NextResponse.json({ success: true, message: "Login berhasil" });

      // Tempelkan Cookie sebagai tanda bahwa user ini sudah login
      response.cookies.set({
        name: "kamura_auth",
        value: "logged_in_true",
        httpOnly: true, // Amankan dari script pihak ketiga
        path: "/",
        maxAge: 60 * 60 * 24, // Berlaku selama 24 jam (1 hari)
      });

      return response;
    }

    // Jika salah password
    return NextResponse.json({ success: false, error: "Kredensial tidak valid" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
