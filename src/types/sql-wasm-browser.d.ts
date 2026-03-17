declare module 'sql.js/dist/sql-wasm-browser.js' {
  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<any>
}
