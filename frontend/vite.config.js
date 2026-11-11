import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import net from 'node:net'

/**
 * Kiểm tra cổng mạng có bị khóa (EACCES do Windows Hyper-V/WinNAT) hoặc đang bận (EADDRINUSE) hay không
 */
function checkPortAvailable(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, host);
  });
}

async function resolveDevPort(preferredPort) {
  const candidates = [preferredPort, 3000, 3001, 4173, 5341, 8000];
  for (const port of candidates) {
    if (await checkPortAvailable(port)) {
      if (port !== preferredPort) {
        console.warn(
          `\x1b[33m[Vite] Cổng ${preferredPort} đang bị Windows (Hyper-V / WinNAT) khóa quyền truy cập (EACCES). Tự động chuyển sang cổng ${port}.\x1b[0m`
        );
      }
      return port;
    }
  }
  return 0; // Để hệ điều hành tự cấp cổng trống bất kỳ
}

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  const preferredPort = Number(env.VITE_PORT) || 5173;
  const devPort = command === 'serve' ? await resolveDevPort(preferredPort) : preferredPort;

  return {
    plugins: [react()],
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-charts': ['recharts'],
            'vendor-icons': ['lucide-react'],
            'vendor-http': ['axios'],
          }
        }
      }
    },
    server: {
      port: devPort,
      host: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        }
      }
    }
  }
})
