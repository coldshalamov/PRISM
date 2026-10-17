import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BoundaryProblem, problem, validateBoundary } from "./proxy";

export async function serveHtml(request: Request, file: "index" | "pitch"): Promise<Response> {
  try {
    validateBoundary(request);
    const filename = file === "index" ? join(process.cwd(), "content", "index.html") :
      join(process.cwd(), "public", "pitch", "index.html");
    return new Response(await readFile(filename, "utf8"), {headers: {
      "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    }});
  } catch (error) {
    if (error instanceof BoundaryProblem) return problem(error.code, error.message, error.status);
    return problem("bundle_missing", "The reviewed frontend bundle has not been synchronized.", 503);
  }
}
