import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nilayam.app',
  appName: 'Nilayam',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: true,
      stats: true,
      resetWhenError: true
    }
  }
};

export default config;
