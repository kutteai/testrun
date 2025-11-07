import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
// import airbnbBase from "eslint-config-airbnb-base";
import pluginImport from "eslint-plugin-import";

export default [
  {
    files: ["src/**/*.{ts,tsx}", "backend/src/**/*.js", "netlify/functions/**/*.js", "config.js"],
    ignores: ["dist/", "netlify/functions/"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 12,
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      import: pluginImport,
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".ts"],
        },
      },
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      // ...airbnbBase.rules,
      ...tseslint.configs.recommended.rules,
      "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
      "import/prefer-default-export": "off",
      "import/extensions": [
        "error",
        "ignorePackages",
        {
          js: "never",
          ts: "never",
        },
      ],
      "max-len": ["error", { code: 120, ignoreUrls: true, ignoreTemplateLiterals: true }],
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": ["error"],
      "lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
      "radix": ["error", "always"],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["backend/src/**/*.js", "config.js"],
    languageOptions: {
      globals: {
        node: true,
        es2021: true,
      },
      parserOptions: {
        sourceType: "module",
      },
    },
    rules: {
      "import/no-import-module-exports": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["netlify/functions/**/*.js"],
    languageOptions: {
      globals: {
        node: true,
        es2021: true,
      },
      parserOptions: {
        sourceType: "module",
      },
    },
    rules: {
      "import/no-import-module-exports": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "consistent-return": "off",
    },
  },
];
