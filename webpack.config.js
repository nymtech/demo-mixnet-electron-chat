const path = require('path')
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin');

const commonConfig = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  node: {
    __dirname: false,
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        loader: 'standard-loader',
        options: {
          typeCheck: true,
          emitErrors: true
        }
      },
      {
        test: /\.tsx?$/,
        loader: 'babel-loader'
      },
      {
        test:/\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.s[a|c]ss$/,
        loader: 'sass-loader!style-loader!css-loader'
    },
    {
        test: /\.(jpg|png|gif|jpeg|woff|woff2|eot|ttf|svg)$/,
        loader: 'url-loader?limit=100000'
    }
    ]
  },
}

module.exports = [
  Object.assign(
    {
      target: 'electron-main',
      entry: { main: './src/main.ts' }
    },
    commonConfig),
  Object.assign(
    {
      target: 'electron-renderer',
      entry: { renderer: './src/renderer.ts' },
      plugins: [
        new HtmlWebpackPlugin({
          template: 'src/index.html',
        }),
        new HtmlWebpackTagsPlugin({ tags: ['semantic.min.js', "custom.css"], append: true }),
        new MiniCssExtractPlugin({
          chunkFilename: '[name].css',
          filename: '[name].css'
        }),
        new CopyPlugin([
          {
            from: 'src/semantic.min.js',
          },
          {
            from: 'src/jquery-3.4.1.min.js',
          },
          {
            from: 'src/custom.css',
          },
          {
            from: 'src/assets',
            to: 'assets'
          }
        ]),
      ]
    },
    commonConfig),
]