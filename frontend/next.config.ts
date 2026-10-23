import type { NextConfig } from "next";
import { resolveCmsMediaUrl } from "./environment";

const mediaUrl = resolveCmsMediaUrl(process.env);

const protocolWithoutColon = mediaUrl.protocol.slice(0, -1) as "http" | "https";
const isLoopbackMediaHost =
  new Set(["127.0.0.1", "[::1]", "localhost"]).has(mediaUrl.hostname) ||
  mediaUrl.hostname.endsWith(".localhost");

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  images: {
    dangerouslyAllowLocalIP: isLoopbackMediaHost,
    maximumRedirects: 0,
    remotePatterns: [
      {
        protocol: protocolWithoutColon,
        hostname: mediaUrl.hostname,
        port: mediaUrl.port,
        pathname: "/**",
        search: "",
      },
    ],
  },
  experimental: {
    typedEnv: true,
  },
};

export default nextConfig;
