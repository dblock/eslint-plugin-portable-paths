import portablePaths from "eslint-plugin-portable-paths";

export default [{
  ignores: ["NUL.txt"],
  plugins: { "portable-paths": portablePaths },
  rules: { "portable-paths/no-windows-invalid-names": "error" },
}];
