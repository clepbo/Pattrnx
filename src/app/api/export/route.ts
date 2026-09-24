import { getUser } from "@/server/auth";
import { exportData } from "@/server/services/account";

/** Downloads everything the signed-in user owns as JSON (PRD F15). */
export async function GET(request: Request) {
  // Session cookies are SameSite=Lax, so another site could navigate here and trigger
  // downloads (burning the export quota). Only allow same-origin or direct requests (SR-3).
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "cross-site requests are not allowed" }, { status: 403 });
  }
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const result = await exportData(user);
  if (!result.ok) {
    return Response.json({ error: result.error.message }, { status: result.error.code === "limit" ? 429 : 500 });
  }
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(result.data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="pattrnx-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
