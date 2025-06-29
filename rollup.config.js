import typescript from '@rollup/plugin-typescript';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const banner = readFileSync('./LICENSE_BANNER', 'utf8');

export default [
  // UMD build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/metagraph.js',
      format: 'umd',
      name: 'metagraph',
      banner,
      sourcemap: true
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false
      })
    ]
  },
  // UMD minified build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/metagraph.min.js',
      format: 'umd',
      name: 'metagraph',
      banner,
      sourcemap: true,
      compact: true
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false
      })
    ]
  },
  // ES module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/metagraph.esm.js',
      format: 'es',
      banner,
      sourcemap: true
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationMap: true,
        outDir: 'dist'
      })
    ]
  }
];