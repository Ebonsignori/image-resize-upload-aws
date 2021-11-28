/* eslint-disable filenames/match-regex */
module.exports = {
  env: {
    node: true,
    browser: true,
  },
  parser: "babel-eslint",
  parserOptions: {
    sourceType: "module",
    allowImportExportEverywhere: true,
  },
  extends: ["plugin:github/recommended"],
  plugins: ["github", "simple-import-sort"],
  rules: {
    "max-len": [2, { code: 120, tabWidth: 4, ignoreUrls: true }],
    indent: ["error", 2],
    "linebreak-style": ["error", "unix"],
    "comma-dangle": [
      "error",
      {
        arrays: "always-multiline",
        objects: "always-multiline",
        imports: "always-multiline",
        exports: "always-multiline",
        functions: "never",
      },
    ],
    "no-use-before-define": [
      "error",
      { functions: false, classes: true, variables: true },
    ],
    "eslint-comments/no-use": 0,
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "sort-imports": 0,
    "import/no-commonjs": 0,
    "i18n-text/no-en": 0,
  },
};
