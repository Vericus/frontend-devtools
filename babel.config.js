module.exports = api => {
  api.cache(true);
  return {
    presets: [
      ["@babel/env", { targets: { node: true } }],
      "@babel/preset-typescript"
    ],
    plugins: [
      "@babel/proposal-class-properties",
      "@babel/proposal-object-rest-spread",
      "@babel/plugin-proposal-numeric-separator"
    ]
  };
};
