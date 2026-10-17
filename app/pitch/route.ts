import { serveHtml } from "../../lib/html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  if (new URL(request.url).pathname === "/pitch") {
    return new Response(null, {status: 307, headers: {Location: "/pitch/", "Cache-Control": "no-store"}});
  }
  return serveHtml(request, "pitch");
}
