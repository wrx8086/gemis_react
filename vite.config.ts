import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/web': {
        target: 'http://APOHVM001.int.anadatprime.ch:8842',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})