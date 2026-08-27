export interface AppConfig {
  appName: string;
  environment: 'development' | 'test' | 'production';
}

function readEnvironment(): AppConfig['environment'] {
  const value = import.meta.env.MODE;
  if (value === 'production') return 'production';
  if (value === 'test') return 'test';
  return 'development';
}

export const appConfig: AppConfig = {
  appName: 'Gurukulam AI',
  environment: readEnvironment(),
};
