import { createConfig, DEFAULT_IGNORES } from "./src/index.mjs";

export default [
  { ignores: ["fixtures/**"] },
  {
    files: ["**/*.mjs"],
    rules: {
      "no-undef": "error",
      "no-unused-vars": "error",
      eqeqeq: "error",
    },
  },
  createConfig({ root: import.meta.dirname, ignores: [...DEFAULT_IGNORES, "fixtures/**"] }),
];
