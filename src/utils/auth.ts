export const getAppOrigin = () => {
  if (typeof window === 'undefined') {
    return (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');
  }

  return `${window.location.origin}${window.location.pathname}`.replace(/\/$/, '');
};

export const getOAuthRedirectUrl = () => {
  const explicitRedirectUrl = (import.meta.env.VITE_AUTH_REDIRECT_URL || '').trim();
  if (explicitRedirectUrl) {
    return explicitRedirectUrl;
  }

  return `${getAppOrigin()}#/dashboard-router`;
};
