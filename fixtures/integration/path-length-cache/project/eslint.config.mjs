import portablePaths from "eslint-plugin-portable-paths";

export default [{
  ...portablePaths.configs.recommended,
  rules: {
    ...portablePaths.configs.recommended.rules,
    "portable-paths/max-pathname-length": ["error", { max: 20 }],
  },
}];
