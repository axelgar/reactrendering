import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import * as babel from '@babel/core'
import reactCompiler from 'babel-plugin-react-compiler'

// Pre-compile a scenario with the React Compiler at build time — in Node, where
// the compiler's dependency tree (@babel/core → debug → util, require.resolve)
// works, unlike the browser worker. Importing a scenario with `?reactcompiler`
// yields its compiler OUTPUT as a string, which the app shows + runs as the
// "compiler" variant. enforce: 'pre' gives us the raw source before esbuild.
function rrReactCompiler(): Plugin {
  return {
    name: 'rr-react-compiler',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('?reactcompiler')) return null
      const out = babel.transformSync(code, {
        filename: id.split('?')[0],
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ['typescript', 'jsx'] },
        plugins: [[reactCompiler as unknown as object, { target: '19' }]],
      })
      return { code: `export default ${JSON.stringify(out?.code ?? code)}`, map: null }
    },
  }
}

// Two entry points (index.html shell, runtime.html iframe) keep the iframe's
// React instance decoupled from the shell's.
export default defineConfig({
  plugins: [rrReactCompiler(), react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        runtime: './runtime.html',
      },
    },
  },
})
