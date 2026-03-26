declare module 'sql.js/dist/sql-wasm-browser.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<any>
}
