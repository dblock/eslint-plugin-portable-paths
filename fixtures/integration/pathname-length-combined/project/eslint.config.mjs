import portablePaths from "eslint-plugin-portable-paths";

export default [{
  plugins: { "portable-paths": portablePaths },
  rules: {
    "portable-paths/max-pathname-length": ["error", { max: 24, maxNameBytes: 25 }],
  },
}];
