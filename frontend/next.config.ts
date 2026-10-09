import type { NextConfig } from "next";

const rawMediaUrl = process.env.CMS_MEDIA_URL;

if (!rawMediaUrl) {
  throw new Error(`Env. var. 'CMS_MEDIA_URL' is not set`);
}

const mediaUrl = new URL(rawMediaUrl);

const protocolWithoutColon = mediaUrl.protocol.slice(0, -1) as "http" | "https";
const isLoopbackMediaHost = new Set(["127.0.0.1", "[::1]", "localhost"]).has(
  mediaUrl.hostname,
);

const nextConfig: NextConfig = {
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
