const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const MergeJsonWebpackPlugin = require('merge-jsons-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const sass = require('sass');

const utils = require('./utils.js');
const environment = require('./environment');
const imageInlineSizeLimit = parseInt(process.env.IMAGE_INLINE_SIZE_LIMIT || '10000');
const getTsLoaderRule = (env) => {
  const rules = [
    {
      loader: 'thread-loader',
      options: {
        // There should be 1 cpu for the fork-ts-checker-webpack-plugin.
        // The value may need to be adjusted (e.g. to 1) in some CI environments,
        // as cpus() may report more cores than what are available to the build.
        workers: require('os').cpus().length - 1,
      },
    },
    {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
        happyPackMode: true,
      },
    },
  ];
  return rules;
};

module.exports = async (options) => {
  const isEnvProduction = options.env === 'production';
  const isEnvDevelopment = options.env === 'development';
  return merge(
    {
      cache: {
        // 1. Set cache type to filesystem
        type: 'filesystem',
        cacheDirectory: path.resolve(__dirname, '../build/cache'),
        buildDependencies: {
          // 2. Add your config as buildDependency to get cache invalidation on config change
          config: [
            __filename,
            path.resolve(__dirname, `webpack.${isEnvDevelopment ? 'dev' : 'prod'}.js`),
            path.resolve(__dirname, 'environment.js'),
            path.resolve(__dirname, 'utils.js'),
            path.resolve(__dirname, '../postcss.config.js'),
            path.resolve(__dirname, '../tsconfig.json'),
          ],
        },
      },
      resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        modules: ['node_modules'],
        alias: {
          ...utils.mapTypescriptAliasToWebpackAlias(),
          react: path.resolve('./node_modules/react'),
        },
        fallback: {
          path: require.resolve('path-browserify'),
        },
      },
      module: {
        rules: [
          {
            oneOf: [
              {
                test: /\.tsx?$/,
                use: getTsLoaderRule(options.env),
                include: [utils.root('./src')],
                exclude: [utils.root('node_modules')],
              },
              {
                test: [/\.avif$/],
                type: 'asset',
                mimetype: 'image/avif',
                parser: {
                  dataUrlCondition: {
                    maxSize: imageInlineSizeLimit,
                  },
                },
              },
              // "url" loader works like "file" loader except that it embeds assets
              // smaller than specified limit in bytes as data URLs to avoid requests.
              // A missing `test` is equivalent to a match.
              {
                test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                type: 'asset',
                parser: {
                  dataUrlCondition: {
                    maxSize: imageInlineSizeLimit,
                  },
                },
              },
              {
                test: /\.svg$/,
                use: [
                  {
                    loader: require.resolve('@svgr/webpack'),
                    options: {
                      prettier: false,
                      svgo: false,
                      svgoConfig: {
                        plugins: [{ removeViewBox: false }],
                      },
                      titleProp: true,
                      ref: true,
                    },
                  },
                  {
                    loader: require.resolve('file-loader'),
                    options: {
                      name: 'static/media/[name].[hash].[ext]',
                    },
                  },
                ],
                issuer: {
                  and: [/\.(ts|tsx|js|jsx|md|mdx)$/],
                },
              },
              {
                test: /\.less$/,
                use: [
                  {
                    loader: isEnvDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
                  },
                  {
                    loader: 'css-loader', // translates CSS into CommonJS
                  },
                  {
                    loader: 'less-loader', // compiles Less to CSS
                    options: {
                      lessOptions: {
                        javascriptEnabled: true,
                      },
                    },
                  },
                ],
              },
              {
                test: /\.(sa|sc|c)ss$/,
                use: [
                  {
                    loader: isEnvDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
                  },
                  'css-loader',
                  {
                    loader: 'postcss-loader',
                  },
                  {
                    loader: 'sass-loader',
                    options: { implementation: sass },
                  },
                ],
              },
              // "file" loader makes sure those assets get served by WebpackDevServer.
              // When you `import` an asset, you get its (virtual) filename.
              // In production, they would get copied to the `build` folder.
              // This loader doesn't use a "test" so it will catch all modules
              // that fall through the other loaders.
              {
                // Exclude `js` files to keep "css" loader working as it injects
                // its runtime that would otherwise be processed through "file" loader.
                // Also exclude `html` and `json` extensions so they get processed
                // by webpacks internal loaders.
                exclude: [/^$/, /\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
                type: 'asset/resource',
              },
              // ** STOP ** Are you adding a new loader?
              // Make sure to add the new loader(s) before the "file" loader.
              //=======
            ].filter(Boolean),
          },
        ],
      },
      stats: {
        children: false,
      },
      plugins: [
        new webpack.EnvironmentPlugin({
          // react-jhipster requires LOG_LEVEL config.
          LOG_LEVEL: isEnvDevelopment ? 'info' : 'error',
        }),
        new webpack.DefinePlugin({
          DEVELOPMENT: JSON.stringify(isEnvDevelopment),
          VERSION: JSON.stringify(environment.VERSION),
          SERVER_API_URL: JSON.stringify(environment.SERVER_API_URL),
          'process.env': JSON.stringify(process.env),
        }),
        new ESLintPlugin({
          extensions: ['js', 'mjs', 'jsx', 'ts', 'tsx'],
        }),
        new ForkTsCheckerWebpackPlugin(),
        // new CopyWebpackPlugin({
        //   patterns: [
        //     { from: './public/favicon.ico', to: 'favicon.ico' },
        //     { from: './public/manifest.webapp', to: 'manifest.webapp' },
        //     // jhipster-needle-add-assets-to-webpack - JHipster will add/remove third-party resources in this array
        //     { from: './public/robots.txt', to: 'robots.txt' },
        //   ],
        // }),
        new HtmlWebpackPlugin({
          template: './public/index.html',
          chunksSortMode: 'auto',
          inject: 'body',
          base: '/',
        }),
        new CleanWebpackPlugin(),
      ],
    },
    require('./webpack.microfrontend')({ serve: options.env.WEBPACK_SERVE })
  );
};
