import { Form, Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AlertTriangle, Mail, Lock } from 'lucide-react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { AlertTitle, AlertDescription } from '@/components/ui/alert';
import AuthLayout from '@/layouts/auth-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    const { errors } = usePage().props as any;
    const safeErrors = errors ?? {};

    // 🔥 Erreurs locales de validation côté client
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

    // Détecter le type d'erreur serveur
    const emailError = safeErrors.email || '';
    const needsVerification = emailError.toLowerCase().includes('verify your email');
    const isInvalidCredentials = emailError.toLowerCase().includes('credentials');

    // Validation côté client
    const validateEmail = (email: string): string | null => {
        if (!email.trim()) return 'Email address is required.';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return 'Please enter a valid email address.';
        return null;
    };

    const validatePassword = (password: string): string | null => {
        if (!password) return 'Password is required.';
        if (password.length < 8) return 'Password must be at least 8 characters.';
        return null;
    };

    const clearClientError = (field: string) => {
        setClientErrors((prev) => {
            const copy = { ...prev };
            delete copy[field];
            return copy;
        });
    };

    const handleBlur = (field: string, value: string) => {
        let error: string | null = null;

        if (field === 'email') error = validateEmail(value);
        if (field === 'password') error = validatePassword(value);

        if (error) {
            setClientErrors((prev) => ({ ...prev, [field]: error! }));
        } else {
            clearClientError(field);
        }
    };

    // Erreur finale = client OU serveur
    const getError = (field: string): string | undefined => {
        return clientErrors[field] || safeErrors[field];
    };

    return (
        <AuthLayout
            title="Log in to your account"
            description="Enter your email and password below to log in"
        >
            <Head title="Log in" />

            {/* 🔥 Alert : Email non vérifié */}
            {needsVerification && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    <div className="flex items-start gap-3">
                        <Mail className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                            <AlertTitle className="font-semibold">
                                Email not verified
                            </AlertTitle>
                            <AlertDescription className="mt-1">
                                Please check your inbox and click the
                                verification link to activate your account
                                before logging in.
                                <br />
                                <span className="mt-1 block text-xs">
                                    Don't forget to check your spam folder!
                                </span>
                            </AlertDescription>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔥 Alert : Identifiants incorrects */}
            {isInvalidCredentials && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    <div className="flex items-start gap-3">
                        <Lock className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                            <AlertTitle className="font-semibold">
                                Login failed
                            </AlertTitle>
                            <AlertDescription className="mt-1">
                                The email address or password you entered is
                                incorrect. Please try again.
                            </AlertDescription>
                        </div>
                    </div>
                </div>
            )}

            {/* Status : lien de vérification envoyé */}
            {status === 'verification-link-sent' && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                    <AlertTitle className="font-medium">
                        Verification Link Sent
                    </AlertTitle>
                    <AlertDescription className="mt-1">
                        We've sent a verification link to your email address.
                        Please click the link to verify your account.
                    </AlertDescription>
                </div>
            )}

            {status && status !== 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing }) => (
                    <>
                        <div className="grid gap-6">
                            {/* Email */}
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                    className={
                                        getError('email') ||
                                        needsVerification ||
                                        isInvalidCredentials
                                            ? 'border-red-500 focus-visible:ring-red-500'
                                            : ''
                                    }
                                    onChange={() => clearClientError('email')}
                                    onBlur={(e) =>
                                        handleBlur('email', e.target.value)
                                    }
                                />
                                {/* Afficher erreur client uniquement (pas les erreurs serveur ici) */}
                                {clientErrors.email && (
                                    <InputError message={clientErrors.email} />
                                )}
                            </div>

                            {/* Password */}
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Password"
                                    className={
                                        getError('password') ||
                                        isInvalidCredentials
                                            ? 'border-red-500 focus-visible:ring-red-500'
                                            : ''
                                    }
                                    onChange={() =>
                                        clearClientError('password')
                                    }
                                    onBlur={(e) =>
                                        handleBlur('password', e.target.value)
                                    }
                                />
                                {clientErrors.password && (
                                    <InputError
                                        message={clientErrors.password}
                                    />
                                )}
                            </div>

                            {/* Remember me */}
                            <div className="flex items-center space-x-3 cursor-pointer">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember">Remember me</Label>
                            </div>

                            {/* Submit */}
                            <Button
                                type="submit"
                                className="mt-4 w-full cursor-pointer"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Log in
                            </Button>
                        </div>

                        {canRegister && (
                            <div className="text-center text-sm text-muted-foreground">
                                Don't have an account?{' '}
                                <TextLink href={register()} tabIndex={5}>
                                    Sign up
                                </TextLink>
                            </div>
                        )}
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}