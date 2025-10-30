import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/ViewerPro.js',
      format: 'umd',
      name: 'ViewerPro',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: 'dist/ViewerPro.esm.js',
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/ViewerPro.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
  ],
  plugins: [
    typescript({ tsconfig: './tsconfig.json' }),
    postcss(),
  ],
};
