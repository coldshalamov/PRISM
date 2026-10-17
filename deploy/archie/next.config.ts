import type { NextConfig } from "next";

const config: NextConfig = {
  turbopack: {root: process.cwd()},
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {
    "/": ["./content/index.html"],
    "/pitch": ["./public/pitch/index.html"],
  },
  async headers() {
    return [{source: "/:path*", headers: [
      {key: "Cache-Control", value: "no-store"},
      {key: "X-Content-Type-Options", value: "nosniff"},
      {key: "Referrer-Policy", value: "no-referrer"},
      {key: "X-Frame-Options", value: "DENY"},
      {key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'"},
    ]}];
  },
};

export default config;
