module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.optimization.realContentHash = false
      webpackConfig.ignoreWarnings = [
        /Circular dependency between chunks with runtime/,
      ]
      return webpackConfig
    },
  },
}
