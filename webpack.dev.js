const webpack = require('webpack');
const webpackMerge = require('webpack-merge').merge;
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin');

const utils = require('./utils.js');
const commonConfig = require('./webpack.common.js');

const ENV = 'development';

module.exports = async options => {
  const PORT = process.env.APP_PORT || 3000;
  const PROXY_PORT = process.env.APP_PROXY_PORT || 3300;
  return webpackMerge(await commonConfig({env: ENV}), {
    // devtool: 'cheap-module-source-map', // https://reactjs.org/docs/cross-origin-errors.html
    mode: ENV,
    entry: './src/index.tsx',
    output: {
      path: utils.root('build'),
      filename: '[name].[contenthash:8].js',
      chunkFilename: '[name].[chunkhash:8].chunk.js'
    },
    optimization: {
      moduleIds: 'named',
    },
    devServer: {
      hot: false,
      // static: {
      //   directory: path.resolve(__dirname, './build'),
      //   devMiddleware: {
      //     writeToDisk: true,
      //     index: 'index.html',
      //   }
      // },
      port: PORT,
      proxy: [
        {
          context: ['/api', '/services', '/management', '/v3/api-docs', '/h2-console', '/auth'],
          target: `http${options.tls ? 's' : ''}://localhost:8080`,
          secure: false,
          changeOrigin: options.tls,
        },
      ],
      https: options.tls,
      historyApiFallback: true,
      client: {
        overlay: {
          warnings: false,
          errors: true,
        },
      }
    },
    stats: 'none',
    plugins: [
      process.env.JHI_DISABLE_WEBPACK_LOGS
        ? null
        : new SimpleProgressWebpackPlugin({
            // format: options.stats === "minimal" ? "compact" : "expanded",
          }),
      new BrowserSyncPlugin(
        {
          https: options.tls,
          host: 'localhost',
          port: PROXY_PORT,
          proxy: {
            target: `http${options.tls ? 's' : ''}://localhost:${options.watch ? '8080' : PORT}`,
            ws: true,
            proxyOptions: {
              changeOrigin: false, //pass the Host header to the backend unchanged  https://github.com/Browsersync/browser-sync/issues/430
            },
          },
          socket: {
            clients: {
              heartbeatTimeout: 60000,
            },
          },
          open: true,
          /*
      ,ghostMode: { // uncomment this part to disable BrowserSync ghostMode; https://github.com/jhipster/generator-jhipster/issues/11116
        clicks: false,
        location: false,
        forms: false,
        scroll: false
      } */
        },
        {
          reload: false,
        }
      ),
    ].filter(Boolean),
  });
};
