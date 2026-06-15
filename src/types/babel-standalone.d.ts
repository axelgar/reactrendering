declare module '@babel/standalone' {
  export interface BabelFileResult {
    code: string | null
    map?: unknown
  }
  export function transform(code: string, options: Record<string, unknown>): BabelFileResult
  export const availablePlugins: Record<string, unknown>
  export const availablePresets: Record<string, unknown>
}

declare module 'babel-plugin-react-compiler' {
  const plugin: unknown
  export default plugin
}
