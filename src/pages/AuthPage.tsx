
import React, { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeOffIcon, LogoIcon, ArrowLeftIcon } from '../constants';
import ThemeToggle from '../components/ui/ThemeToggle';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { getOAuthRedirectUrl } from '../utils/auth';

const setPendingRoleSetup = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('nilayam_pending_role_setup', '1');
};

const InputField: React.FC<{
    id: string;
    label: string;
    type: string;
    value: string;
    onChange: (val: string) => void;
    required?: boolean;
    minLength?: number;
    children?: React.ReactNode;
}> = ({ id, label, type, value, onChange, children, ...props }) => (
    <div className="space-y-1.5">
        <label htmlFor={id} className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400">
            {label}
        </label>
        <div className="relative">
            <input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                {...props}
                className="block w-full px-3 py-2.5 border-2 border-neutral-200 dark:border-neutral-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white transition-all duration-200 placeholder-neutral-400 dark:placeholder-neutral-500"
            />
            {children}
        </div>
    </div>
);

const AuthPage: React.FC = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { error: toastError, success: toastSuccess } = useToast();
    const navigate = useNavigate();
    const { t, language } = useLanguage();

    const handleEmailAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let response;
            if (isSignUp) {
                if (!fullName.trim()) { throw new Error("Full name is required."); }

                // Client-side password strength validation
                const hasUppercase = /[A-Z]/.test(password);
                const hasNumber = /[0-9]/.test(password);
                const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
                const isLongEnough = password.length >= 8;

                if (!isLongEnough || !hasUppercase || !hasNumber || !hasSpecial) {
                    throw new Error("Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.");
                }

                response = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
            } else {
                response = await supabase.auth.signInWithPassword({ email, password });
            }
            if (response.error) { throw response.error; }
            if (isSignUp && response.data.user && !response.data.session) {
                toastSuccess('Sign up successful! Please check your email to confirm your account.');
                setIsSignUp(false); setFullName(''); setPassword('');
            } else {
                setPendingRoleSetup();
                navigate('/dashboard-router');
            }
        } catch (err: any) {
            toastError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: getOAuthRedirectUrl()
                }
            });
            if (error) throw error;
            setPendingRoleSetup();
        } catch (err: any) {
            toastError(err.message || 'Google sign-in failed.');
            setLoading(false);
        }
    };

    const isTranslated = language !== 'en';

    return (
        <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors duration-300">
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50 relative">
                <div className="flex items-center justify-between px-6 py-5">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="bg-blue-600 rounded-xl p-2 shadow-sm">
                            <LogoIcon className="h-8 w-8 text-white" />
                        </div>
                        <span className={`text-3xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500 dark:from-white dark:to-neutral-400 ${isTranslated ? 'font-bold' : 'font-righteous'}`}>{t('app.name')}</span>
                    </Link>
                    <ThemeToggle />
                </div>
            </header>
            <main className="flex-grow flex items-center justify-center p-4 relative z-10">
                <Card className="w-full max-w-md p-8 space-y-8 animate-fade-in relative overflow-hidden bg-white/50 dark:bg-neutral-900/40 border border-white/20 dark:border-white/5 backdrop-blur-xl">
                    <button onClick={() => navigate(-1)} className="absolute top-6 left-6 p-2 rounded-full text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-20" aria-label="Go back">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    
                    <div className="absolute -top-12 -right-12 w-48 h-48 opacity-20 dark:opacity-10 pointer-events-none transform rotate-12">
                        <img src="/auth-gemini.png" alt="" className="w-full h-full object-contain" />
                    </div>
                    
                    <div className="text-center relative z-10">
                        <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">{isSignUp ? 'Create an Account' : 'Welcome Back!'}</h1>
                        <p className="mt-2 text-neutral-500 dark:text-neutral-400 font-medium">{isSignUp ? t('signup.subtitle') : 'Sign in to your dashboard'}</p>
                    </div>
                    {!isSupabaseConfigured && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                            Local setup is missing `VITE_SUPABASE_URL` and/or `VITE_SUPABASE_ANON_KEY`, so sign-in is disabled until `.env.local` is configured.
                        </div>
                    )}
                    <form className="space-y-6" onSubmit={handleEmailAuthAction}>
                        {isSignUp && (<div className="animate-fade-in"><InputField id="fullName" label="Full Name" type="text" value={fullName} onChange={setFullName} required /></div>)}
                        <InputField id="email" label={t('label.email')} type="email" value={email} onChange={setEmail} required />
                        <InputField id="password" label={t('label.password')} type={showPassword ? 'text' : 'password'} value={password} onChange={setPassword} required minLength={8}>
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-white transition-colors z-20 focus:outline-none" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            </button>
                        </InputField>
                        <div className="space-y-4 pt-2">
                            <Button 
                                type="submit" 
                                isLoading={loading}
                                fullWidth
                                variant="primary"
                                disabled={!isSupabaseConfigured}
                            >
                                {t('btn.submit') || 'Submit'}
                            </Button>
                        </div>
                    </form>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-neutral-900 px-2 text-neutral-500 font-bold">OR</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading || !isSupabaseConfigured}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all active:scale-95 disabled:opacity-50 group font-bold text-neutral-700 dark:text-white"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Continue with Google
                    </button>
                    <div className="pt-4 text-center">
                        <p className="text-sm text-neutral-400 font-medium">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                            <button onClick={() => setIsSignUp(!isSignUp)} className="font-bold text-blue-400 hover:underline ml-1.5 transition-all active:scale-95">
                                {isSignUp ? (t('btn.signin') || 'Sign In') : (t('btn.signup') || 'Sign Up')}
                            </button>
                        </p>
                    </div>
                </Card>
            </main>
        </div>
    );
};

export default AuthPage;
