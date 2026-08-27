export interface AppConfig {
  appName: string;
  environment: 'development' | 'test' | 'production';
}

function readEnvironment(): AppConfig['environment'] {
  const mode = (globalThis as { __VITE_MODE__?: string }).__VITE_MODE__;
  if (mode === 'production') return 'production';
  if (mode === 'test') return 'test';
  return 'development';
}

export const appConfig: AppConfig = {
  appName: 'Gurukulam AI',
  environment: readEnvironment(),
};
