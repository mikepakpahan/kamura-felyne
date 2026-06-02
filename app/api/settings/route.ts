import { NextResponse } from "next/server";
import { getSheetData } from "@/lib/google"; // Pastikan path-nya sesuai
import { getGoogleToken } from "@/lib/google"; // Pastikan fungsi ini di-export dari lib/google.ts

export const dynamic = "force-dynamic";

// Mengambil data pengaturan
export async function GET() {
  try {
    const rows = await getSheetData("Settings");
    const config: Record<string, string> = {};

    // Looping dari baris 2 jika baris 1 adalah header (Key, Value, Notes)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0]) config[row[0]] = row[1] || "";
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Menyimpan data pengaturan (Update)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = await getSheetData("Settings");
    const token = await getGoogleToken();
    const sheetId = process.env.SPREADSHEET_ID!;

    // Kita akan mencari baris mana yang cocok dengan Key, lalu mengupdate Value-nya
    for (let i = 1; i < rows.length; i++) {
      const key = rows[i][0];
      if (body[key] !== undefined) {
        // Update nilai di kolom B (Kolom ke-2)
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Settings!B${i + 1}?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [[body[key]]] }),
        });
      }
    }

    return NextResponse.json({ success: true, message: "Pengaturan berhasil disimpan!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
