import { defineConfig } from 'vite';

export default defineConfig({
  // Base './' ensures all assets (scripts, styles, images) load properly
  // whether deployed to a custom domain (xenonrift.com) or a GitHub repository subpath (user.github.io/repo)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
