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
  const isProduction = false;
  // argv.mode === 'production';
  const browser = env.browser || 'chrome';

  return {
    // Enable WebAssembly experiments to fix tiny-secp256k1 issues
    experiments: {
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    },

    entry: {
      popup: './src/popup/index.tsx',
      options: './src/options/index.tsx',
    },
    output: {
      path: path.resolve(__dirname, `dist/${browser}`),
      filename: '[name].js',
      clean: true,
      publicPath: '',
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          type: 'javascript/auto',
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              experimentalWatchApi: false,
              configFile: path.resolve(__dirname, 'tsconfig.json'),
              compilerOptions: {
                jsxImportSource: 'react',
              },
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name].[hash][ext]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[hash][ext]',
          },
        },
        // Add WebAssembly module rule to fix tiny-secp256k1 issues
        {
          test: /\.wasm$/,
          type: 'webassembly/async',
        },
        // Handle mjs files properly
        {
          test: /\.m?js$/,
          resolve: {
            fullySpecified: false, // disable the behaviour
          },
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'react/jsx-runtime': require.resolve('react/jsx-runtime'),
      },
      fallback: {
        // Remove all fallbacks for functional Node.js modules
      },
      // Add module resolution for node_modules
      modules: [
        'node_modules',
      ],
      // Handle ESM modules properly
      extensionAlias: {
        '.js': ['.js', '.ts', '.tsx', '.mjs'],
      },
    },
    plugins: [
      // Environment variables
      new DefinePlugin({
        'process.env': JSON.stringify({
          NODE_ENV: argv.mode,
          BROWSER: browser,
        }),
        'process.env.NODE_ENV': JSON.stringify(argv.mode),
        'process.env.BROWSER': JSON.stringify(browser),
        global: 'globalThis',
        // Define process for browser compatibility
        'process.browser': JSON.stringify(true),
        'process.version': JSON.stringify(''),
        'process.versions': JSON.stringify({}),
        // Inject CONFIG as a global constant
        PAYCIO_CONFIG: JSON.stringify(CONFIG),
      }),

      // Provide Buffer and process globals
      new webpack.ProvidePlugin({
        global: 'globalThis',
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
          removeStyleLinkTypeAttributes: true,
        } : false,
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
          removeStyleLinkTypeAttributes: true,
        } : false,
      }),

      // CSS extraction
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),

      // Copy manifest and assets
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'manifest.json',
            to: 'manifest.json',
            transform: (content) => {
              const manifest = JSON.parse(content.toString());
              // No browser-specific modifications needed for a static manifest
              return JSON.stringify(manifest, null, 2);
            },
          },
          {
            from: 'src/assets',
            to: 'assets',
            noErrorOnMissing: true,
          },
          // Remove UI specific copies if src/ui is removed as well
          // If these paths don't exist, CopyWebpackPlugin will report warnings, but not fail the build.
          // If they should exist for static purposes, leave them. For now, assume they are functional related.
          // {
          //   from: 'src/ui/popup.html',
          //   to: 'ui/popup.html',
          //   noErrorOnMissing: true,
          // },
          // {
          //   from: 'src/ui/styles',
          //   to: 'ui/styles',
          //   noErrorOnMissing: true,
          // },
        ],
      }),

      // Compression for production
      ...(isProduction ? [
        new CompressionPlugin({
          test: /\.(js|css|html|svg)$/,
          algorithm: 'gzip',
          threshold: 10240,
          minRatio: 0.8,
        }),
      ] : []),
    ],
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
            },
            mangle: isProduction,
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            enforce: true,
          },
          // Remove background chunk optimization
        },
      },
    },
    devtool: isProduction ? false : 'cheap-module-source-map',
    watch: argv.mode === 'development',
        watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 300,
      poll: 1000,
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 1024000, // Increased for crypto libraries
      maxAssetSize: 1024000,
    },
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
      errorDetails: true, // This will show more error details
    },
    // Add this to handle Node.js modules properly
    target: 'web',
    node: {
      global: false,
      __filename: false,
      __dirname: false,
    },
  };
};
