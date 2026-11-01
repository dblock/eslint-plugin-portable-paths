import { createConfig } from "eslint-plugin-portable-paths";

export const config = createConfig({
  root: import.meta.dirname,
  reportOn: "oxlint.config.mjs",
});

const plugin = config.plugins["portable-paths"];
const lengthRule = plugin.rules["max-pathname-length"];
const lengthOptions = {
  ...lengthRule.meta.defaultOptions[0],
  max: 200,
  maxNameBytes: 255,
};
config.rules["portable-paths/max-pathname-length"] = ["error", lengthOptions];
// Oxlint validates defaults before merging configured options.
lengthRule.meta.defaultOptions = [lengthOptions];

export default plugin;
