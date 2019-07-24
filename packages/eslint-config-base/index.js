module.exports = {
  env: {
    node: true,
    es6: true,
    browser: true
  },
  extends: [
    "airbnb",
    "plugin:react/recommended",
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "prettier/@typescript-eslint",
    "prettier/react",
    "plugin:prettier/recommended"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks", "prettier"],
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features,
    useJSXTextNode: true,
    ecmaFeatures: {
      jsx: true
    }
  },
  overrides: [
    {
      files: ["*.js", ".jsx"],
      parser: "babel-eslint"
    }
  ],
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "import/prefer-default-export": 0
  }
};
