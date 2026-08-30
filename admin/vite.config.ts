import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5180,
    strictPort: true,
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      input: 'src/main.tsx',
      output: {
        entryFileNames: 'assets/index.js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
