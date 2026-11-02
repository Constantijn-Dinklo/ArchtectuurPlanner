import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'


// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Without it a build would call localhost on the computer of whoever opens the app
  if (command === 'build' && !loadEnv(mode, process.cwd()).VITE_API_URL) {
    throw new Error('VITE_API_URL is not set: a build needs the address of the backend (see .env.example)')
  }

  return {
    plugins: [vue()],
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  }
})
