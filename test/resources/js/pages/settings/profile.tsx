import { Dialog, Transition } from '@headlessui/react';
import { Form, Head, Link, usePage } from '@inertiajs/react';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem } from '@/types';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import { Fragment, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit().url,
    },
];

type PageProps = {
    mustVerifyEmail: boolean;
    status?: string;
    avatarUrl?: string | null;
    profile?: {
        phone?: string | null;
        address?: string | null;
        bio?: string | null;
        company_name?: string | null;
        website?: string | null;
    };
};

export default function Profile({
    mustVerifyEmail,
    status,
    avatarUrl,
    profile,
}: PageProps) {
    const { auth, errors } = usePage().props as any;

    const [showErrorModal, setShowErrorModal] = useState(false);

    // 🔥 Récupérer le rôle de l'utilisateur
    const userRole = auth.user.role; // 'driver' ou 'owner'
    const isOwner = userRole === 'owner';

    // Debug
    console.log('══════════════════════════════════════');
    console.log('👤 User complet:', auth.user);
    console.log('🎭 Role:', userRole);
    console.log('📋 Profile:', profile);
    console.log('🖼️ Avatar URL:', avatarUrl);
    console.log('══════════════════════════════════════');

    // Ouvrir le modal dès qu'il y a des erreurs
    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            setShowErrorModal(true);
        }
    }, [errors]);

    const prof = profile ?? {
        phone: '',
        address: '',
        bio: '',
        company_name: '',
        website: '',
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile Settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Profile information"
                        description="Update your profile information"
                    />

                    
                    {/* Avatar actuel */}
                    {avatarUrl && (
                        <div className="mb-4 flex justify-start">
                            <img
                                src={avatarUrl}
                                alt="Profile avatar"
                                className="h-24 w-24 rounded-full object-cover border"
                            />
                        </div>
                    )}

                    <Form
                        {...ProfileController.update.form()}
                        options={{ preserveScroll: true }}
                        encType="multipart/form-data"
                        className="space-y-6"
                    >
                        {({
                            processing,
                            recentlySuccessful,
                            errors: formErrors,
                        }) => (
                            <>
                                {/* Name */}
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Full name"
                                        defaultValue={auth.user.name}
                                        maxLength={255}
                                        className={`mt-1 block w-full ${
                                            formErrors.name
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : ''
                                        }`}
                                    />
                                    <InputError
                                        className="mt-2"
                                        message={formErrors.name}
                                    />
                                </div>

                                {/* Email */}
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="email@example.com"
                                        defaultValue={auth.user.email}
                                        maxLength={255}
                                        className={`mt-1 block w-full ${
                                            formErrors.email
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : ''
                                        }`}
                                    />
                                    <InputError
                                        className="mt-2"
                                        message={formErrors.email}
                                    />
                                </div>

                                {/* Phone */}
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        placeholder="Phone number"
                                        defaultValue={prof.phone ?? ''}
                                        maxLength={20}
                                        inputMode="numeric"
                                        pattern="[0-9]{8,20}"
                                        className={`mt-1 block w-full ${
                                            formErrors.phone
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : ''
                                        }`}
                                    />
                                    <InputError
                                        className="mt-2"
                                        message={formErrors.phone}
                                    />
                                </div>

                                {/* Address */}
                                <div className="grid gap-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        name="address"
                                        placeholder="Address"
                                        defaultValue={prof.address ?? ''}
                                        maxLength={255}
                                        className={`mt-1 block w-full ${
                                            formErrors.address
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : ''
                                        }`}
                                    />
                                    <InputError
                                        className="mt-2"
                                        message={formErrors.address}
                                    />
                                </div>

                                {/* ═══════════════════════════════════════════════ */}
                                {/* 🔥 CHAMPS RÉSERVÉS AUX OWNERS UNIQUEMENT        */}
                                {/* ═══════════════════════════════════════════════ */}
                                {isOwner && (
                                    <>
                                        {/* Company name */}
                                        <div className="grid gap-2">
                                            <Label htmlFor="company_name">
                                                Company / Parking name
                                            </Label>
                                            <Input
                                                id="company_name"
                                                name="company_name"
                                                placeholder="Company name"
                                                defaultValue={prof.company_name ?? ''}
                                                maxLength={255}
                                                className={`mt-1 block w-full ${
                                                    formErrors.company_name
                                                        ? 'border-red-500 focus-visible:ring-red-500'
                                                        : ''
                                                }`}
                                            />
                                            <InputError
                                                className="mt-2"
                                                message={formErrors.company_name}
                                            />
                                        </div>

                                        {/* Website */}
                                        <div className="grid gap-2">
                                            <Label htmlFor="website">Website</Label>
                                            <Input
                                                id="website"
                                                name="website"
                                                placeholder="https://example.com"
                                                defaultValue={prof.website ?? ''}
                                                maxLength={255}
                                                type="url"
                                                className={`mt-1 block w-full ${
                                                    formErrors.website
                                                        ? 'border-red-500 focus-visible:ring-red-500'
                                                        : ''
                                                }`}
                                            />
                                            <InputError
                                                className="mt-2"
                                                message={formErrors.website}
                                            />
                                        </div>

                                        {/* Description / bio */}
                                        <div className="grid gap-2">
                                            <Label htmlFor="bio">
                                                Parking Description
                                            </Label>
                                            <textarea
                                                id="bio"
                                                name="bio"
                                                defaultValue={prof.bio ?? ''}
                                                maxLength={1000}
                                                rows={4}
                                                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                                                    formErrors.bio
                                                        ? 'border-red-500 focus-visible:ring-red-500'
                                                        : 'border-input'
                                                }`}
                                                placeholder="Describe your parking facilities, amenities, opening hours, etc."
                                            />
                                            <InputError
                                                className="mt-2"
                                                message={formErrors.bio}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Avatar upload */}
                                <div className="grid gap-2">
                                    <Label htmlFor="avatar">Profile photo</Label>
                                    <Input
                                        id="avatar"
                                        type="file"
                                        name="avatar"
                                        accept="image/*"
                                        className={`mt-1 block w-full ${
                                            formErrors.avatar
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : ''
                                        }`}
                                    />
                                    <InputError
                                        className="mt-2"
                                        message={formErrors.avatar}
                                    />
                                </div>

                                {/* Vérification email */}
                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div>
                                            <p className="-mt-4 text-sm text-muted-foreground">
                                                Your email address is unverified.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                >
                                                    Click here to resend the
                                                    verification email.
                                                </Link>
                                            </p>

                                            {status === 'verification-link-sent' && (
                                                <div className="mt-2 text-sm font-medium text-green-600">
                                                    A new verification link has been
                                                    sent to your email address.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        Save
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-neutral-600">
                                            Saved
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                <DeleteUser />
            </SettingsLayout>

            {/* MODAL D'ERREURS GLOBAL */}
            <Transition appear show={showErrorModal} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => setShowErrorModal(false)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
                                    <Dialog.Title className="text-lg font-semibold text-red-600">
                                        Form errors
                                    </Dialog.Title>
                                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                        <p>Please correct the following fields:</p>
                                        <ul className="mt-2 list-inside list-disc space-y-1">
                                            {errors &&
                                                Object.entries(errors).map(
                                                    ([field, message]) => (
                                                        <li key={field}>
                                                            {message as string}
                                                        </li>
                                                    ),
                                                )}
                                        </ul>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setShowErrorModal(false)}
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </AppLayout>
    );
}