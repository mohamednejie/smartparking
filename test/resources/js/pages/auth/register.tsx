import { Form, Head, router, usePage } from '@inertiajs/react';
import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircle, Mail, Car, ParkingCircle } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';
import { store } from '@/routes/register';

export default function Register() {
    const { errors: serverErrors } = usePage().props as any;

    // 🔥 État pour le rôle sélectionné
    const [selectedRole, setSelectedRole] = useState<'driver' | 'owner'>('driver');

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

    // 🔥 Quand on change de rôle, on efface l'erreur parking_photo
    const handleRoleChange = (role: 'driver' | 'owner') => {
        setSelectedRole(role);
        clearFieldError('parking_photo');
        clearFieldError('role');
    };

    const handleGoToLogin = () => {
        router.visit(login(), {
            replace: true,
            preserveState: false,
        });
    };

    // 🔥 Textes dynamiques selon le rôle
    const pageConfig = {
        driver: {
            title: 'Create a driver account',
            description: 'Enter your details below to start finding parking spots',
            buttonText: 'Create driver account',
        },
        owner: {
            title: 'Create a parking owner account',
            description: 'Enter your details and upload a photo of your parking to validate your account',
            buttonText: 'Create owner account',
        },
    };

    return (
        <AuthLayout
            title={pageConfig[selectedRole].title}
            description={pageConfig[selectedRole].description}
        >
            <Head title={`Register - ${selectedRole === 'driver' ? 'Driver' : 'Parking Owner'}`} />

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
                    const rawPasswordError = fieldErrors.password as string | undefined;

                    const isConfirmationMismatch =
                        rawPasswordError &&
                        rawPasswordError.toLowerCase().includes('confirmation') &&
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
                                {/* ═══════════════════════════════════════════════ */}
                                {/* 🔥 SÉLECTEUR DE RÔLE                            */}
                                {/* ═══════════════════════════════════════════════ */}
                                <div className="grid gap-3">
                                    <Label>I want to register as</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Option Driver */}
                                        <button
                                            type="button"
                                            onClick={() => handleRoleChange('driver')}
                                            className={`
                                                flex flex-col items-center gap-2 rounded-lg border-2 p-4 
                                                transition-all duration-200 cursor-pointer
                                                ${selectedRole === 'driver'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                                                }
                                            `}
                                        >
                                            <Car className={`h-8 w-8 ${selectedRole === 'driver' ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <div className="text-center">
                                                <p className="font-medium">Driver</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Find parking spots
                                                </p>
                                            </div>
                                        </button>

                                        {/* Option Owner */}
                                        <button
                                            type="button"
                                            onClick={() => handleRoleChange('owner')}
                                            className={`
                                                flex flex-col items-center gap-2 rounded-lg border-2 p-4 
                                                transition-all duration-200 cursor-pointer
                                                ${selectedRole === 'owner'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                                                }
                                            `}
                                        >
                                            <ParkingCircle className={`h-8 w-8 ${selectedRole === 'owner' ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <div className="text-center">
                                                <p className="font-medium">Owner</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Rent your parking
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                    <InputError message={fieldErrors.role} />
                                </div>

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
                                    <InputError message={fieldErrors.name} className="mt-2" />
                                </div>

                                {/* Email */}
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>
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
                                        onChange={() => clearFieldError('email')}
                                    />
                                    <InputError message={fieldErrors.email} />
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
                                        onChange={() => clearFieldError('password')}
                                    />
                                    <InputError message={passwordError} />
                                </div>

                                {/* Confirm password */}
                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">Confirm password</Label>
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
                                            clearFieldError('password_confirmation');
                                            clearFieldError('password');
                                        }}
                                    />
                                    <InputError message={passwordConfirmationError} />
                                </div>

                                {/* ═══════════════════════════════════════════════ */}
                                {/* 🔥 CHAMP PARKING PHOTO - UNIQUEMENT POUR OWNER  */}
                                {/* ═══════════════════════════════════════════════ */}
                                {selectedRole === 'owner' && (
                                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Label htmlFor="parking_photo">
                                            Parking photo <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4">
                                            <Input
                                                id="parking_photo"
                                                type="file"
                                                name="parking_photo"
                                                accept="image/*"
                                                required={selectedRole === 'owner'}
                                                tabIndex={5}
                                                className={
                                                    fieldErrors.parking_photo
                                                        ? 'border-red-500 focus-visible:ring-red-500'
                                                        : ''
                                                }
                                                onChange={() => clearFieldError('parking_photo')}
                                            />
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                Upload a clear photo of your parking lot. 
                                                Our AI will verify it's a valid parking space.
                                            </p>
                                        </div>
                                        <InputError message={fieldErrors.parking_photo} />
                                    </div>
                                )}

                                {/* 🔥 Champ caché pour le rôle */}
                                <input type="hidden" name="role" value={selectedRole} />

                                <Button
                                    type="submit"
                                    className="mt-2 w-full"
                                    tabIndex={6}
                                    data-test="register-button"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    {pageConfig[selectedRole].buttonText}
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
                                        {selectedRole === 'owner' 
                                            ? 'Owner Account Created! 🎉' 
                                            : 'Account Created Successfully! 🎉'
                                        }
                                    </Dialog.Title>

                                    {/* Message email */}
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                                            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                                <p className="font-semibold">Verify your email</p>
                                                <p className="mt-1">
                                                    We've sent a verification link to your email address.
                                                    Please check your inbox and click the link to activate your account.
                                                </p>
                                            </div>
                                        </div>

                                        {/* 🔥 Message spécifique pour les owners */}
                                        {selectedRole === 'owner' && (
                                            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                                                <ParkingCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                                                <div className="text-sm text-green-800 dark:text-green-300">
                                                    <p className="font-semibold">Parking verified ✓</p>
                                                    <p className="mt-1">
                                                        Your parking photo has been validated by our AI.
                                                        You can start listing your parking spaces!
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-center text-xs text-muted-foreground">
                                            Don't forget to check your spam folder!
                                        </p>
                                    </div>

                                    {/* Bouton fermer */}
                                    <div className="mt-6">
                                        <Button
                                            className="w-full"
                                            onClick={handleGoToLogin}
                                        >
                                            Go to Login
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