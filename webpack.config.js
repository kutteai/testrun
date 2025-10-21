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
      layers: true,
      topLevelAwait: true,
    },

    entry: {
      popup: './src/popup/index.tsx',
      background: './src/background/index.ts',
      'content-script': './src/content-script/index.ts',
      'injected/provider': './src/injected/provider.js',
      options: './src/options/index.tsx',
      expand: './src/expand.tsx',
    },
    output: {
      path: path.resolve(__dirname, `dist/${browser}`),
      filename: '[name].js',
      clean: true,
      publicPath: '',
      // Important: Set the correct environment for webpack
      environment: {
        arrowFunction: false,
        bigIntLiteral: false,
        const: false,
        destructuring: false,
        dynamicImport: false,
        forOf: false,
        module: false,
      },
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
              configFile: path.resolve(__dirname, 'tsconfig.json'),
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
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.wasm', '.mjs'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      fallback: {
        process: require.resolve('process/browser.js'),
        buffer: require.resolve('buffer'),
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        fs: false,
        net: false,
        tls: false,
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        zlib: require.resolve('browserify-zlib'),
        url: require.resolve('url/'),
        assert: require.resolve('assert/'),
        util: require.resolve('util/'),
        os: require.resolve('os-browserify/browser'),
        vm: require.resolve('vm-browserify'),
      },
      // Add module resolution for node_modules
      modules: [
        'node_modules',
        path.resolve(__dirname, 'src'),
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
          ...process.env,
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
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser.js',
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

      new HtmlWebpackPlugin({
        template: './src/expand.html',
        filename: 'expand.html',
        chunks: ['expand'],
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

              // Update manifest for different browsers
              if (browser === 'firefox') {
                // Firefox specific changes
                delete manifest.background.service_worker;
                manifest.background.scripts = ['background.js'];
              } else if (browser === 'edge') {
                // Edge specific changes if needed
              }

              return JSON.stringify(manifest, null, 2);
            },
          },
          {
            from: 'src/assets',
            to: 'assets',
            noErrorOnMissing: true,
          },
          {
            from: 'src/ui/popup.html',
            to: 'ui/popup.html',
            noErrorOnMissing: true,
          },
          {
            from: 'src/ui/styles',
            to: 'ui/styles',
            noErrorOnMissing: true,
          },
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
