import { defineConfig } from 'vite';
import { sites } from './build/sites-vite-plugin.js';

export default defineConfig(async ({ mode }) => {
  const isTest = mode === 'test' || Boolean(process.env.VITEST);
  const plugins = [sites()];

  if (!isTest) {
    process.env.WRANGLER_WRITE_LOGS ??= 'false';
    process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
    process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';
    const { cloudflare } = await import('@cloudflare/vite-plugin');
    plugins.push(...cloudflare({
      viteEnvironment: { name: 'server' },
      config: {
        main: './worker/index.js',
        assets: {
          binding: 'ASSETS',
          not_found_handling: 'single-page-application'
        }
      }
    }));
  }

  return {
    plugins,
    environments: {
      client: {
        build: {
          target: 'es2022',
          sourcemap: true,
          rollupOptions: {
            output: {
              entryFileNames: 'assets/macroflow.js',
              chunkFileNames: 'assets/[name]-[hash].js',
              assetFileNames: assetInfo => assetInfo.name?.endsWith('.css')
                ? 'assets/macroflow.css'
                : 'assets/[name]-[hash][extname]'
            }
          }
        }
      }
    },
    test: {
      environment: 'node',
      coverage: { reporter: ['text', 'html'] }
    }
  };
});
