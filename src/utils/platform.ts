export type ShellPlatform = 'web' | 'app';

const isNativeCapacitor = () => {
    if (typeof window === 'undefined') return false;

    const capacitor = (window as Window & {
        Capacitor?: {
            isNativePlatform?: () => boolean;
            getPlatform?: () => string;
        };
    }).Capacitor;

    if (capacitor?.isNativePlatform?.()) return true;

    const platform = capacitor?.getPlatform?.();
    return platform === 'android' || platform === 'ios';
};

export const getShellPlatform = (): ShellPlatform => (isNativeCapacitor() ? 'app' : 'web');

export const isAppShell = () => getShellPlatform() === 'app';
