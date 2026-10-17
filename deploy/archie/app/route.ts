import { serveHtml } from "../lib/html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return serveHtml(request, "index"); }
