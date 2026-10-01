module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Resolve workspace packages from source
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@nexa/types': '../../packages/types/src/index.ts',
            '@nexa/api-client': '../../packages/api-client/src/index.ts',
            '@nexa/design-tokens': '../../packages/design-tokens/src/index.ts',
            '@nexa/validation': '../../packages/validation/src/index.ts',
          },
        },
      ],
    ],
  };
};
