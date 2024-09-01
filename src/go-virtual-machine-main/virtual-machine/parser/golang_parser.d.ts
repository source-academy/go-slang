import peggy from 'peggy'

declare module './golang_parser.js' {
  const parse: peggy.Parser.parse
  export { parse }
}
