// import { copy } from 'esbuild-plugin-copy'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  loader: {
    '.glb': 'dataurl',
    '.gltf': 'file',
  },
  esbuildPlugins: [
    // copy({
    //   assets: {
    //     from: ['./src/assets/**/*'],
    //     to: ['./assets'],
    //   },
    // }),
  ],
})
