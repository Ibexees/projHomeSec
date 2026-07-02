import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
 server: {
    
    host: '192.168.178.34',
    port: 5173,
     https: {
      key: fs.readFileSync('../localhost+2-key.pem'),
      cert: fs.readFileSync('../localhost+2.pem')

    }
 
  },
  plugins: [react()],
})