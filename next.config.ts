import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",

  // В development Service Worker лучше не включать,
  // чтобы старый кэш не мешал изменениям.
  disable: process.env.NODE_ENV === "development",

  register: true,
  reloadOnOnline: true,
});

function getSupabaseImageRemotePatterns(): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return [];
  }

  try {
    const url = new URL(supabaseUrl);

    return [
      {
        protocol: url.protocol === "http:" ? "http" : "https",
        hostname: url.hostname,
        port: url.port,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    console.warn(
      "NEXT_PUBLIC_SUPABASE_URL is invalid. Remote exercise images will not be configured.",
    );

    return [];
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: getSupabaseImageRemotePatterns(),
  },
};

export default withSerwist(nextConfig);
