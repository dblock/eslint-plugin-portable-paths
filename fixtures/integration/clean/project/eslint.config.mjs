import portablePaths from "eslint-plugin-portable-paths";

export default [{
  plugins: { "portable-paths": portablePaths },
  rules: { "portable-paths/no-case-collisions": "error" },
}];
