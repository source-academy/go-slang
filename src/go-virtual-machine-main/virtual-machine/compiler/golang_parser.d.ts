import peggy from 'peggy'

declare module './golang_parser.js' {
  export const parse: peggy.Parser.parse
}
