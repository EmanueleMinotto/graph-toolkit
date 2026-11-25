export default {
  '*.{ts,mjs}': ['prettier --write', 'eslint --max-warnings 0 --fix'],
  '*.{json,md,yml}': 'prettier --write',
};
