
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const missingConfigMessage = 'SUPABASE_CLIENT: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Configure .env.local before using auth or data features.';

const createDisabledQuery = () => {
  const result = {
    data: null,
    error: new Error(missingConfigMessage),
    count: 0,
    status: 503,
    statusText: 'Supabase not configured',
  };

  let proxy: any;
  proxy = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'then') {
          return (onFulfilled?: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(onFulfilled, onRejected);
        }
        if (prop === 'catch') {
          return (onRejected?: (reason: unknown) => unknown) => Promise.resolve(result).catch(onRejected);
        }
        if (prop === 'finally') {
          return (onFinally?: () => void) => Promise.resolve(result).finally(onFinally);
        }
        return () => proxy;
      },
    }
  );

  return proxy;
};

const disabledQuery = createDisabledQuery();

const createDisabledAuthResult = () => ({
  data: { user: null, session: null },
  error: new Error(missingConfigMessage),
});

const createDisabledSupabaseClient = () =>
  ({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => undefined,
          },
        },
      }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => createDisabledAuthResult(),
      signUp: async () => createDisabledAuthResult(),
      updateUser: async () => ({ data: { user: null }, error: new Error(missingConfigMessage) }),
      getUser: async () => ({ data: { user: null }, error: new Error(missingConfigMessage) }),
    },
    from: () => disabledQuery,
    rpc: () => disabledQuery,
    storage: {
      from: () => disabledQuery,
    },
    channel: () => ({
      on: () => ({
        subscribe: () => ({
          unsubscribe: () => undefined,
        }),
      }),
      subscribe: () => ({
        unsubscribe: () => undefined,
      }),
    }),
    removeChannel: () => undefined,
    removeAllChannels: () => undefined,
  }) as any;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

console.log('SUPABASE_CLIENT: Initializing with URL:', supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : 'missing');
if (!isSupabaseConfigured) {
  console.warn(missingConfigMessage);
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: { 'x-application-name': 'nilayam' },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        timeout: 30000,
      },
    })
  : createDisabledSupabaseClient();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
  (window as any).__NILAYAM_SUPABASE_CONFIGURED__ = isSupabaseConfigured;
}
