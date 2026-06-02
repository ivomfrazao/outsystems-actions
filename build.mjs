import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: {
    background: 'src/background/index.ts',
    content:    'src/content/index.ts',
    popup:      'src/popup/index.ts',
  },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  outdir: 'dist',
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(config);
  console.log('Build complete.');
}
