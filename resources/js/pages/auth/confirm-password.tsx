import { Form, Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <AuthLayout
            title="Confirm your password"
            description="This is a secure area of the application. Please confirm your password before continuing."
        >
            <Head title="Confirm password" />

            <Form {...store.form()} resetOnSuccess={['password']}>
                {({ processing, errors }) => (
                    <div className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                placeholder="Password"
                                autoComplete="current-password"
                                autoFocus
                                className={
                                    errors.password
                                        ? 'border-red-500 focus-visible:ring-red-500'
                                        : ''
                                }
                            />

                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            {/* Bouton retour stylé */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="inline-flex items-center gap-1"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to settings
                            </Button>

                            {/* Bouton de confirmation */}
                            <Button
                                className="w-full sm:w-auto"
                                disabled={processing}
                                data-test="confirm-password-button"
                            >
                                {processing && (
                                    <Spinner className="mr-2 h-4 w-4" />
                                )}
                                Confirm password
                            </Button>
                        </div>
                    </div>
                )}
            </Form>
        </AuthLayout>
    );
}