import { createConfig, DEFAULT_IGNORE } from "./index.mjs";

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
  createConfig({ root: import.meta.dirname, ignore: [...DEFAULT_IGNORE, "fixtures/**"] }),
];
