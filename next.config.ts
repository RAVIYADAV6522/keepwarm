import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships its own WASM build of Postgres; let Node load it as-is.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Make sure the SQL migrations are deployed alongside the server code.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
};

export default nextConfig;
