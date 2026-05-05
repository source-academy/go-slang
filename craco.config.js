module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.optimization.realContentHash = false
      return webpackConfig
    },
  },
}
