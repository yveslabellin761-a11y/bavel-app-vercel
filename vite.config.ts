import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

function emitPrecacheManifest() {
  return {
    name: 'bavel-precache-manifest',
    apply: 'build' as const,
    generateBundle(_options: unknown, bundle: Record<string, { type: string; fileName: string }>) {
      const assets = Object.values(bundle)
        .filter(({ type, fileName }) => (type === 'chunk' || /\.css$/i.test(fileName)) && !/\.map$/i.test(fileName))
        .map(({ fileName }) => `/${fileName}`);
      this.emitFile({
        type: 'asset',
        fileName: 'precache-manifest.json',
        source: JSON.stringify(assets)
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    '';

  return {
    plugins: [react(), tailwindcss(), emitPrecacheManifest()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
    },
    envPrefix: ['VITE_'],
    resolve: {
      dedupe: ['react', 'react-dom', 'motion'],
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@react-oauth/google', 'motion/react', 'lucide-react']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('@sentry/')) return 'vendor-sentry';
            if (id.includes('@supabase/')) return 'vendor-supabase';
            if (id.includes('@tensorflow/') || id.includes('nsfwjs')) return 'vendor-vision';
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/'))
              return 'vendor-react';
            if (id.includes('/motion/')) return 'vendor-motion';
            if (id.includes('/lucide-react/')) return 'vendor-icons';
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Do not reload the app when the server persists local demo data.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/user_db.json', '**/dist/**'] }
    }
  };
});
