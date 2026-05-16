import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/background.ts', 'src/content.ts', 'src/popup.ts'],
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
