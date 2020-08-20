const path = require('path'); // eslint-disable-line no-undef

const devMode = process.env.NODE_ENV !== 'production'; // eslint-disable-line no-undef

module.exports = {
  // eslint-disable-line no-undef
  entry: {
    index: path.resolve(__dirname, './src/index.js'), // eslint-disable-line no-undef
  },
  output: {
    path: path.resolve(__dirname, './dist'), // eslint-disable-line no-undef
    filename: '[name].js',
    libraryTarget: 'umd',
    globalObject: "typeof self !== 'undefined' ? self : this", // webpack的一个bug导致umd无法在node上使用, 见https://github.com/webpack/webpack/pull/8625
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  optimization: {
    minimize: false,
  },
  plugins: [],
};
