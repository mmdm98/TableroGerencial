import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/TableroGerencial/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          apexcharts: ['apexcharts', 'react-apexcharts'],
          supabase: ['@supabase/supabase-js'],
          xlsx: ['xlsx', 'papaparse'],
        },
      },
    },
  },
})
