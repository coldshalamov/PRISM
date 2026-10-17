import { proxyDemo } from "../../../lib/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return proxyDemo(request); }
export const POST = GET;
export const PATCH = GET;
export const DELETE = GET;
export const PUT = GET;
export const HEAD = GET;
export const OPTIONS = GET;
