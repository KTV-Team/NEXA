import type { ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext) => {
  const projectId = process.env['EXPO_PUBLIC_EAS_PROJECT_ID']?.trim();
  const existingEas = config.extra?.['eas'];
  const eas = existingEas && typeof existingEas === 'object' && !Array.isArray(existingEas)
    ? existingEas
    : {};
  return {
    ...config,
    extra: {
      ...config.extra,
      eas: { ...eas, ...(projectId ? { projectId } : {}) },
    },
  };
};
