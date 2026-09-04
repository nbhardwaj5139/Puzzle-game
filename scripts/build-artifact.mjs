/**
 * Packages the app into ONE self-contained HTML file that can be published as
 * a Claude Artifact or opened straight off disk.
 *
 *   npm run build:artifact   ->  dist-artifact/overtime-protocol.html
 *
 * Artifacts wrap the file in their own <!doctype>/<head>/<body>, so this emits
 * body-level content only: the font link, the built CSS, the mount point and
 * the built JS. The bundle is compiled as an IIFE rather than an ES module so
 * it runs from an inline <script> with no module resolution at all.
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const ROOT = resolve(import.meta.dirname, '..')
const STAGING = join(ROOT, 'node_modules', '.artifact-build')
const OUT_DIR = join(ROOT, 'dist-artifact')
const OUT_FILE = join(OUT_DIR, 'overtime-protocol.html')

const FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900' +
  '&family=JetBrains+Mono:wght@400;500;700&display=swap'

await rm(STAGING, { recursive: true, force: true })

await build({
  root: ROOT,
  configFile: false,
  plugins: [react(), tailwindcss()],
  logLevel: 'warn',
  build: {
    outDir: STAGING,
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
})

// Custom output names drop the assets/ prefix, so collect from the whole tree.
async function collect(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await collect(path)))
    else out.push(path)
  }
  return out
}

const files = await collect(STAGING)
const jsPath = files.find((f) => f.endsWith('.js'))
const cssPath = files.find((f) => f.endsWith('.css'))
if (!jsPath || !cssPath) {
  throw new Error(`Expected one .js and one .css in ${STAGING}, got: ${files.join(', ')}`)
}

const js = await readFile(jsPath, 'utf8')
const css = await readFile(cssPath, 'utf8')

// A literal </script> anywhere in the bundle would close the inline tag early.
const safeJs = js.replaceAll('</script', '<\\/script')

const html = `<title>Overtime Protocol</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${FONTS}" />
<style>
${css}
</style>
<div id="root"></div>
<script>
${safeJs}
</script>
`

await mkdir(OUT_DIR, { recursive: true })
await writeFile(OUT_FILE, html, 'utf8')
await rm(STAGING, { recursive: true, force: true })

const kb = (n) => `${(n / 1024).toFixed(1)} kB`
console.log(`built ${OUT_FILE}`)
console.log(`  css ${kb(css.length)}  js ${kb(js.length)}  total ${kb(html.length)}`)
