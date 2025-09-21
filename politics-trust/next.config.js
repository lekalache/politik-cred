/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable experimental features if needed
  },
  images: {
    // Configure image optimization
    domains: [],
  },
  // Analytics configuration will be automatically handled by Vercel
  // No additional configuration needed for @vercel/analytics
}

module.exports = nextConfig