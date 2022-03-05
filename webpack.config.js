const webpack = require("webpack");
const TerserJSPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const path = require("path");
const purgecss = require("@fullhuman/postcss-purgecss");

module.exports = {
  mode: "production",
  entry: {
    main: "./assets/index.js",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, ".tmp/dist"),
  },
  optimization: {
    minimizer: [new TerserJSPlugin({}), new CssMinimizerPlugin()],
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new webpack.ProvidePlugin({
      $: "jquery",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(scss)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: "css-loader", // translates CSS into CommonJS modules
          },
          {
            loader: "postcss-loader", // Run postcss actions
            options: {
              postcssOptions: {
                plugins: [
                  purgecss({
                    content: [, "./src/results/**/*.njk", "./assets/**/*.js"],
                    safelist: {
                      greedy: [
                        /^ct-/,
                        /modal/,
                        /^division-/,
                        /collapsing/,
                        /is-focused/,
                      ],
                    },
                  }),
                  require("autoprefixer"),
                ],
              },
            },
          },
          {
            loader: "sass-loader", // compiles Sass to CSS
          },
        ],
      },
    ],
  },
  performance: {
    hints: process.env.NODE_ENV === "production" ? "warning" : false,
    maxEntrypointSize: 307200,
  },
};
