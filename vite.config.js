import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // Base './' ensures all assets (scripts, styles, images) load properly
  // whether deployed to a custom domain (xenonrift.com) or a GitHub repository subpath (user.github.io/repo)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        privacy: resolve(import.meta.dirname, 'privacy/index.html'),
        terms: resolve(import.meta.dirname, 'terms/index.html'),
        // Supabase Auth email links land here (Site URL and the recovery redirect; see supabase/templates/README.md).
        authConfirmed: resolve(import.meta.dirname, 'auth/confirmed/index.html'),
        authReset: resolve(import.meta.dirname, 'auth/reset/index.html'),
        // Apple TV sign-in: the TV shows a code, the pilot approves it here (supabase/functions/device-link in the game repo).
        link: resolve(import.meta.dirname, 'link/index.html'),
      },
    },
  },
});
