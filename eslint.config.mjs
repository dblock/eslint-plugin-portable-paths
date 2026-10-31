import { createConfig } from "./index.mjs";

export default [
  {
    files: ["**/*.mjs"],
    rules: {
      "no-undef": "error",
      "no-unused-vars": "error",
      eqeqeq: "error",
    },
  },
  createConfig({ root: import.meta.dirname }),
];
