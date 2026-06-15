// The instrument transform (Babel visitor).
//
// Turns *plain* React component source into the same shape the hand-placed
// `track()` produces, so authored code stays plain while the running copy is
// instrumented:
//   • wrap each detected function component:  const Foo = (p) => ...
//       → const Foo = track('Foo', (p) => ...)
//   • rewrite hooks:  useState(x)  →  useTrackedState(x)
//   • inject:  import { track, useTrackedState } from '<trackModule>'
//
// Portable on purpose: the same visitor runs under @babel/core (the Vite
// plugin, now) and @babel/standalone (the compile worker, later).

interface Options {
  trackModule?: string
}

// `babel` and AST nodes are loosely typed — this is an internal transform and
// pinning @babel/types here buys little.
export function instrumentPlugin(babel: { types: any }, options: Options = {}) {
  const t = babel.types
  const trackModule = options.trackModule ?? '../track'

  const isComponentName = (name: string) => /^[A-Z]/.test(name)

  function hasJSX(fnPath: any): boolean {
    let found = false
    fnPath.traverse({
      JSXElement() {
        found = true
      },
      JSXFragment() {
        found = true
      },
    })
    return found
  }

  const wrap = (name: string, fnExpr: any) =>
    t.callExpression(t.identifier('track'), [t.stringLiteral(name), fnExpr])

  return {
    name: 'rr-instrument',
    visitor: {
      Program: {
        exit(path: any) {
          const importDecl = t.importDeclaration(
            [
              t.importSpecifier(t.identifier('track'), t.identifier('track')),
              t.importSpecifier(t.identifier('useTrackedState'), t.identifier('useTrackedState')),
              t.importSpecifier(t.identifier('useTrackedContext'), t.identifier('useTrackedContext')),
              t.importSpecifier(t.identifier('trackedCreateContext'), t.identifier('trackedCreateContext')),
            ],
            t.stringLiteral(trackModule),
          )
          path.unshiftContainer('body', importDecl)
        },
      },

      // useState(...) → useTrackedState(...) and useContext(...) → useTrackedContext(...)
      // (the injected track() call has callee `track`, so it is never matched)
      CallExpression(path: any) {
        const callee = path.node.callee
        if (t.isIdentifier(callee, { name: 'useState' })) {
          path.node.callee = t.identifier('useTrackedState')
        } else if (t.isIdentifier(callee, { name: 'useContext' })) {
          path.node.callee = t.identifier('useTrackedContext')
        } else if (t.isIdentifier(callee, { name: 'createContext' })) {
          path.node.callee = t.identifier('trackedCreateContext')
        }
      },

      // const Foo = (props) => {...}                 → track wraps the fn
      // const Foo = memo(fn) / React.memo(fn) / forwardRef(fn) → track wraps the inner fn
      VariableDeclarator(path: any) {
        const id = path.node.id
        if (!t.isIdentifier(id) || !isComponentName(id.name)) return
        const init = path.node.init

        if (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) {
          // replaceWith (not direct assignment) so traversal descends into the
          // wrapped body and still rewrites useState inside it.
          if (hasJSX(path.get('init'))) path.get('init').replaceWith(wrap(id.name, init))
          return
        }

        if (t.isCallExpression(init)) {
          const callee = init.callee
          const calleeName = t.isIdentifier(callee)
            ? callee.name
            : t.isMemberExpression(callee) && t.isIdentifier(callee.property)
              ? callee.property.name
              : null
          if ((calleeName === 'memo' || calleeName === 'forwardRef') && init.arguments.length) {
            const argPath = path.get('init.arguments.0')
            const arg = init.arguments[0]
            if ((t.isArrowFunctionExpression(arg) || t.isFunctionExpression(arg)) && hasJSX(argPath)) {
              argPath.replaceWith(wrap(id.name, arg))
            }
          }
        }
      },

      // function Foo(props) {...}  →  const Foo = track('Foo', function Foo(){...})
      // Handles standalone, `export function Foo`, and `export default function Foo`,
      // since a `const` can't sit in an export-default's declaration slot.
      FunctionDeclaration(path: any) {
        const node = path.node
        const id = node.id ?? t.identifier('Root')
        if (!isComponentName(id.name)) return
        if (!hasJSX(path)) return

        const fnExpr = t.functionExpression(node.id, node.params, node.body, node.generator, node.async)
        const constDecl = t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier(id.name), wrap(id.name, fnExpr)),
        ])

        const parent = path.parentPath
        if (parent?.isExportDefaultDeclaration()) {
          // export default function App(){}  →  const App = track(...); export default App
          parent.replaceWithMultiple([constDecl, t.exportDefaultDeclaration(t.identifier(id.name))])
        } else if (parent?.isExportNamedDeclaration() && !parent.node.specifiers.length) {
          // export function Foo(){}  →  export const Foo = track(...)
          parent.replaceWith(t.exportNamedDeclaration(constDecl, []))
        } else {
          path.replaceWith(constDecl)
        }
      },
    },
  }
}
