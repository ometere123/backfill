export default [
  { ignores: [".next/**", "node_modules/**", "artifacts/**", "**/*.ts", "**/*.tsx"] },
  { files: ["**/*.mjs"], languageOptions: { globals: { console: "readonly", process: "readonly" } }, rules: { "no-undef": "error", "no-unreachable": "error", "no-dupe-keys": "error" } },
];
