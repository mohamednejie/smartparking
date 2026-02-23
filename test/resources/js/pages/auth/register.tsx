import { Form, Head, router, usePage } from '@inertiajs/react';
import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircle, Mail } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';
import { store } from '@/routes/register';

export default function RegisterOwner() {
    const { errors: serverErrors } = usePage().props as any;

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>(
        serverErrors ?? {},
    );
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        setFieldErrors(serverErrors ?? {});
    }, [serverErrors]);

    const clearFieldError = (field: string) => {
        if (!fieldErrors[field]) return;
        setFieldErrors((prev) => {
            const copy = { ...prev };
            delete copy[field];
            return copy;
        });
    };

    const handleGoToLogin = () => {
        router.visit(login(), {
            replace: true,
            preserveState: false,
        });
    };

    return (
        <AuthLayout
            title="Create a parking owner account"
            description="Enter your details below and upload a photo of your parking to validate your account"
        >
            <Head title="Register - Parking owner" />

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                encType="multipart/form-data"
                className="flex flex-col gap-6"
                options={{
                    preserveScroll: true,
                    onSuccess: () => {
                        setShowSuccessModal(true);
                    },
                }}
            >
                {({ processing }) => {
                    const rawPasswordError = fieldErrors.password as
                        | string
                        | undefined;

                    const isConfirmationMismatch =
                        rawPasswordError &&
                        rawPasswordError
                            .toLowerCase()
                            .includes('confirmation') &&
                        rawPasswordError.toLowerCase().includes('match');

                    const passwordError = isConfirmationMismatch
                        ? undefined
                        : rawPasswordError;

                    const passwordConfirmationError =
                        fieldErrors.password_confirmation ??
                        (isConfirmationMismatch ? rawPasswordError : undefined);

                    return (
                        <>
                            <div className="grid gap-6">
                                {/* Name */}
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        name="name"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="name"
                                        placeholder="Full name"
                                        className={
                                            fieldErrors.name
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : ''
                                        }
                                        onChange={() => clearFieldError('name')}
                                    />
                                    <InputError
                                        message={fieldErrors.name}
                                        className="mt-2"
                                    />
                                </div>

                                {/* Email */}
                                <div className="grid gap-2">
                                    <Label htmlFor="email">
                                        Email address
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        tabIndex={2}
                                        autoComplete="email"
                                        placeholder="email@example.com"
                                        className={
                                            fieldErrors.email
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : ''
                                        }
                                        onChange={() =>
                                            clearFieldError('email')
                                        }
                                    />
                                    <InputError
                                        message={fieldErrors.email}
                                    />
                                </div>

                                {/* Password */}
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        name="password"
                                        required
                                        tabIndex={3}
                                        autoComplete="new-password"
                                        placeholder="Password"
                                        className={
                                            passwordError
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : ''
                                        }
                                        onChange={() =>
                                            clearFieldError('password')
                                        }
                                    />
                                    <InputError message={passwordError} />
                                </div>

                                {/* Confirm password */}
                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">
                                        Confirm password
                                    </Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        name="password_confirmation"
                                        required
                                        tabIndex={4}
                                        autoComplete="new-password"
                                        placeholder="Confirm password"
                                        className={
                                            passwordConfirmationError
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : ''
                                        }
                                        onChange={() => {
                                            clearFieldError(
                                                'password_confirmation',
                                            );
                                            clearFieldError('password');
                                        }}
                                    />
                                    <InputError
                                        message={passwordConfirmationError}
                                    />
                                </div>

                                {/* Parking photo */}
                                <div className="grid gap-2">
                                    <Label htmlFor="parking_photo">
                                        Parking photo (required)
                                    </Label>
                                    <Input
                                        id="parking_photo"
                                        type="file"
                                        name="parking_photo"
                                        accept="image/*"
                                        required
                                        tabIndex={5}
                                        className={
                                            fieldErrors.parking_photo
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : ''
                                        }
                                        onChange={() =>
                                            clearFieldError('parking_photo')
                                        }
                                    />
                                    <InputError
                                        message={fieldErrors.parking_photo}
                                    />
                                </div>

                                <input
                                    type="hidden"
                                    name="role"
                                    value="owner"
                                />

                                <Button
                                    type="submit"
                                    className="mt-2 w-full"
                                    tabIndex={6}
                                    data-test="register-owner-button"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Create owner account
                                </Button>
                            </div>

                            <div className="text-center text-sm text-muted-foreground">
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    tabIndex={7}
                                    className="inline-flex items-center text-primary underline underline-offset-4 hover:no-underline cursor-pointer"
                                    onClick={handleGoToLogin}
                                >
                                    Log in
                                </button>
                            </div>
                        </>
                    );
                }}
            </Form>

            {/* ═══════════════════════════════════════════════ */}
            {/* 🔥 MODAL DE SUCCÈS                             */}
            {/* ═══════════════════════════════════════════════ */}
            <Transition appear show={showSuccessModal} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => setShowSuccessModal(false)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-90"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-90"
                            >
                                <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-neutral-900">
                                    {/* Icône succès */}
                                    <div className="flex justify-center">
                                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400 animate-bounce" />
                                        </div>
                                    </div>

                                    {/* Titre */}
                                    <Dialog.Title className="mt-6 text-center text-xl font-bold text-gray-900 dark:text-white">
                                        Account Created Successfully! 🎉
                                    </Dialog.Title>

                                    {/* Message email */}
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                                            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                                <p className="font-semibold">
                                                    Verify your email
                                                </p>
                                                <p className="mt-1">
                                                    We've sent a verification
                                                    link to your email address.
                                                    Please check your inbox and
                                                    click the link to activate
                                                    your account.
                                                </p>
                                            </div>
                                        </div>

                                        <p className="text-center text-xs text-muted-foreground">
                                            Don't forget to check your spam
                                            folder!
                                        </p>
                                    </div>

                                    {/* Bouton fermer */}
                                    <div className="mt-6">
                                        <Button
                                            className="w-full"
                                            onClick={() =>
                                                setShowSuccessModal(false)
                                            }
                                        >
                                            OK, Got it
                                        </Button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </AuthLayout>
    );
}