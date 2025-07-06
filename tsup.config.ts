import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/tools.ts',
    'src/loader.ts',
    'src/assets.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  loader: {
    '.glb': 'dataurl',
    '.gltf': 'dataurl',
    '.png': 'dataurl',
  },
  esbuildPlugins: [],
})
