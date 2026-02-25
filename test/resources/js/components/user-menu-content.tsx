import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';

import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import type { User } from '@/types';
import { edit } from '@/routes/profile';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleLogout = () => {
        // Ici seulement on nettoie la nav mobile
        cleanup();

        console.log('🚪 Début du logout');
        sessionStorage.setItem('just_logged_out', 'true');

        router.flushAll();

        router.post(
            '/logout',
            {},
            {
                preserveState: false,
                preserveScroll: false,
                onSuccess: () => {
                    console.log('✅ Logout réussi - Redirection');
                    router.visit('/', {
                        replace: true,
                        preserveState: false,
                    });
                },
                onError: (errors) => {
                    console.error('❌ Erreur logout:', errors);
                    window.location.replace('/login');
                },
            },
        );
    };

    const openConfirmModal = () => {
        // NE PAS appeler cleanup() ici, sinon tu risques de démonter le menu
        setConfirmOpen(true);
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Item logout : on utilise onSelect + preventDefault pour 
                ne PAS fermer le menu automatiquement */}
            <DropdownMenuItem
                onSelect={(event) => {
                    event.preventDefault(); // empêche la fermeture du dropdown
                    openConfirmModal();
                }}
                className="cursor-pointer"
            >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
            </DropdownMenuItem>

            {/* MODAL DE CONFIRMATION DE LOGOUT */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm logout</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to log out of your account ?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                setConfirmOpen(false);
                                handleLogout();
                            }}
                        >
                            Yes, log me out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}