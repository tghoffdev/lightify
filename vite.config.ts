import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/hue-discovery': {
        target: 'https://discovery.meethue.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hue-discovery/, ''),
      },
    },
  },
})
