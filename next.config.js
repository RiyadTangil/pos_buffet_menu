/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle MongoDB and other Node.js modules that shouldn't be bundled for the client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
        'timers/promises': false,
      }
    }
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['mongodb']
  }
}

module.exports = nextConfig