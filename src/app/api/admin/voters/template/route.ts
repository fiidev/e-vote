import { getAuthUser } from "@/lib/auth";
import { buildVoterTemplateBuffer } from "@/lib/excel/service";

/**
 * GET /api/admin/voters/template
 * Download template import pemilih (header + 1 baris contoh yang ditolak parser).
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const buffer = buildVoterTemplateBuffer();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-pemilih.xlsx"',
    },
  });
}
