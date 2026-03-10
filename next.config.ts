import withSerwistInit from "@serwist/next"

const isDev = process.env.NODE_ENV !== "production"

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
})

const nextConfig = {
  output: "export" as const,
}

export default withSerwist(nextConfig)
