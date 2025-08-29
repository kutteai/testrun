const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { DefinePlugin } = require('webpack');
const dotenv = require('dotenv');
const webpack = require('webpack');

// Load environment variables
dotenv.config();

// Load config
const { CONFIG } = require('./config.js');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const browser = env.browser || 'chrome';

  return {
    // Enable WebAssembly experiments to fix tiny-secp256k1 issues
    experiments: {
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true
    },

    entry: {
      popup: './src/popup/index.tsx',
      background: './src/background/index.ts',
      content: './src/content/index.ts',
      injected: './src/injected/index.ts',
      options: './src/options/index.tsx'
    },
    output: {
      path: path.resolve(__dirname, `dist/${browser}`),
      filename: '[name].js',
      clean: true,
      publicPath: ''
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              experimentalWatchApi: false,
              configFile: path.resolve(__dirname, 'tsconfig.json')
            }
          },
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader'
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name].[hash][ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[hash][ext]'
          }
        },
        // Add WebAssembly module rule to fix tiny-secp256k1 issues
        {
          test: /\.wasm$/,
          type: 'webassembly/async'
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.wasm'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // Fix axios conflicts by aliasing to main axios version
        'axios/lib/utils': path.resolve(__dirname, 'node_modules/axios/lib/utils.js'),
        'axios/lib/helpers/isURLSameOrigin': path.resolve(__dirname, 'node_modules/axios/lib/helpers/isURLSameOrigin.js'),
        'axios/lib/adapters/http': path.resolve(__dirname, 'node_modules/axios/lib/adapters/http.js'),
        'axios/lib/adapters/xhr': path.resolve(__dirname, 'node_modules/axios/lib/adapters/xhr.js'),
        'axios/lib/core/dispatchRequest': path.resolve(__dirname, 'node_modules/axios/lib/core/dispatchRequest.js'),
        'axios/lib/core/settle': path.resolve(__dirname, 'node_modules/axios/lib/core/settle.js'),
        'axios/lib/core/buildFullPath': path.resolve(__dirname, 'node_modules/axios/lib/core/buildFullPath.js'),
        'axios/lib/core/createError': path.resolve(__dirname, 'node_modules/axios/lib/core/createError.js'),
        'axios/lib/cancel/CancelToken': path.resolve(__dirname, 'node_modules/axios/lib/cancel/CancelToken.js'),
        'axios/lib/helpers/normalizeHeaderName': path.resolve(__dirname, 'node_modules/axios/lib/helpers/normalizeHeaderName.js'),
        'axios/lib/helpers/parseHeaders': path.resolve(__dirname, 'node_modules/axios/lib/helpers/parseHeaders.js'),
        'axios/lib/helpers/cookies': path.resolve(__dirname, 'node_modules/axios/lib/helpers/cookies.js'),
        'axios/lib/helpers/isAbsoluteURL': path.resolve(__dirname, 'node_modules/axios/lib/helpers/isAbsoluteURL.js'),
        'axios/lib/helpers/combineURLs': path.resolve(__dirname, 'node_modules/axios/lib/helpers/combineURLs.js'),
        'axios/lib/helpers/buildURL': path.resolve(__dirname, 'node_modules/axios/lib/helpers/buildURL.js'),
        'axios/lib/core/InterceptorManager': path.resolve(__dirname, 'node_modules/axios/lib/core/InterceptorManager.js'),
        'axios/lib/core/transformData': path.resolve(__dirname, 'node_modules/axios/lib/core/transformData.js'),
        'axios/lib/cancel/Cancel': path.resolve(__dirname, 'node_modules/axios/lib/cancel/Cancel.js'),
        'axios/lib/cancel/isCancel': path.resolve(__dirname, 'node_modules/axios/lib/cancel/isCancel.js'),
        'axios/lib/helpers/spread': path.resolve(__dirname, 'node_modules/axios/lib/helpers/spread.js'),
        'axios/lib/helpers/validator': path.resolve(__dirname, 'node_modules/axios/lib/helpers/validator.js'),
        'axios/lib/core/enhanceError': path.resolve(__dirname, 'node_modules/axios/lib/core/enhanceError.js'),
        'axios/lib/platform': path.resolve(__dirname, 'node_modules/axios/lib/platform/index.js')
      },
      fallback: {
        "process": require.resolve("process/browser"),
        "buffer": require.resolve("buffer"),
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "path": require.resolve("path-browserify"),
        "fs": false,
        "net": false,
        "tls": false,
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "zlib": require.resolve("browserify-zlib"),
        "url": require.resolve("url/"),
        "assert": require.resolve("assert/"),
        "util": require.resolve("util/"),
        "os": require.resolve("os-browserify/browser"),
        "vm": require.resolve("vm-browserify")
      },
      extensionAlias: {
        ".js": [".js", ".ts", ".tsx"]
      }
    },
    plugins: [
      // Environment variables
      new DefinePlugin({
        'process.env': JSON.stringify(process.env),
        'process.env.NODE_ENV': JSON.stringify(argv.mode),
        'process.env.BROWSER': JSON.stringify(browser),
        'window.CONFIG': JSON.stringify(CONFIG),
        'global': 'globalThis',
      }),

      // Provide Buffer global
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
        // Provide global fallbacks for axios
        'process.browser': 'process/browser'
      }),

      // HTML files
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup.html',
        chunks: ['popup'],
        inject: true,
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true
        } : false
      }),

      new HtmlWebpackPlugin({
        template: './src/options/options.html',
        filename: 'options.html',
        chunks: ['options'],
        inject: true,
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true
        } : false
      }),

      // CSS extraction
      new MiniCssExtractPlugin({
        filename: '[name].css'
      }),

      // Copy manifest and assets
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'manifest.json',
            to: 'manifest.json',
            transform: (content) => {
              const manifest = JSON.parse(content.toString());
              
              // Update manifest for different browsers
              if (browser === 'firefox') {
                // Firefox specific changes
                delete manifest.background.service_worker;
                manifest.background.scripts = ['background.js'];
              } else if (browser === 'edge') {
                // Edge specific changes if needed
              }
              
              return JSON.stringify(manifest, null, 2);
            }
          },
          {
            from: 'src/assets',
            to: 'assets',
            noErrorOnMissing: true
          },
          {
            from: 'src/ui/popup.html',
            to: 'ui/popup.html',
            noErrorOnMissing: true
          },
          {
            from: 'src/ui/styles',
            to: 'ui/styles',
            noErrorOnMissing: true
          }
        ]
      }),

      // Compression for production
      ...(isProduction ? [
        new CompressionPlugin({
          test: /\.(js|css|html|svg)$/,
          algorithm: 'gzip',
          threshold: 10240,
          minRatio: 0.8
        })
      ] : [])
    ],
    experiments: {
      asyncWebAssembly: true,
      syncWebAssembly: true
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction
            },
            mangle: isProduction,
            format: {
              comments: false
            }
          },
          extractComments: false
        })
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    },
    devtool: isProduction ? false : 'cheap-module-source-map',
    watch: argv.mode === 'development',
    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 300,
      poll: 1000
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    },
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    }
  };
};