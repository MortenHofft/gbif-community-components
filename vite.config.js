import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Encapsulated (Shadow DOM) build. A light-DOM build is planned as a second
// entry point over the same shared code.
export default defineConfig({
  define: { __VERSION__: JSON.stringify(version) },
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['es'],
      fileName: () => 'gbif-components.js'
    },
    target: 'es2022',
    // Leaflet's stylesheet is inlined into the component that needs it.
    assetsInlineLimit: 1_000_000,
    rollupOptions: {
      // Fixed file names, so that a versioned directory can be copied to a CDN or a CMS
      // as is. (Hashed names change on every build and break hand-copied files.)
      output: { chunkFileNames: 'chunks/[name].js' }
    }
  },
  server: { host: '127.0.0.1' }
});
