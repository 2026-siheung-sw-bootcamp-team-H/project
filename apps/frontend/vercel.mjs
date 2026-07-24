import process from "node:process";
import { URL } from "node:url";

const rawGcpOrigin = process.env.GCP_API_ORIGIN?.trim();
const gcpOrigin = rawGcpOrigin?.replace(/\/+$/, "");

if (gcpOrigin) {
  const parsedOrigin = new URL(gcpOrigin);
  if (parsedOrigin.protocol !== "https:" || parsedOrigin.pathname !== "/") {
    throw new Error("GCP_API_ORIGIN must be an HTTPS origin without a path.");
  }
}

const apiRewrites = gcpOrigin
  ? [
      {
        source: "/api/demo-shop/:path*",
        destination: `${gcpOrigin}/demo-shop/:path*`
      },
      {
        source: "/api/:path*",
        destination: `${gcpOrigin}/api/:path*`
      }
    ]
  : [];

export const config = {
  framework: "vite",
  buildCommand: "npm run build",
  outputDirectory: "dist",
  rewrites: [...apiRewrites, { source: "/(.*)", destination: "/index.html" }],
  headers: [
    {
      source: "/api/:path*",
      headers: [{ key: "Cache-Control", value: "no-store" }]
    }
  ]
};
