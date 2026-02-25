import { Link, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { Car } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import type { NavItem } from '@/types';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { show } from '@/routes/two-factor';
import { edit as editPassword } from '@/routes/user-password';
import { 
     
    User, 
    Lock, 
    Shield, 
    Palette,
    // Alternatives possibles :
    // KeyRound, 
    // Smartphone,
    // SunMoon,
    // Settings,
    // UserCog,
} from 'lucide-react'

// 🔥 Base nav items (pour tous les utilisateurs)
const baseNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: User,
    },
    {
        title: 'Password',
        href: editPassword(),
        icon: Lock,
    },
    {
        title: 'Two-Factor Auth',
        href: show(),
        icon: Shield,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: Palette,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentUrl } = useCurrentUrl();
    const { auth } = usePage().props as any;

    // 🔥 Vérifier si l'utilisateur est un driver
    const isDriver = auth?.user?.role === 'driver';

    // 🔥 Construire la liste des items de navigation
    const sidebarNavItems: NavItem[] = [
        ...baseNavItems.slice(0, 1), // Profile
        // 🔥 Ajouter "My Vehicles" seulement pour les drivers
        ...(isDriver
            ? [
                  {
                      title: 'My Vehicles',
                      href: '/settings/vehicles',
                      icon: Car,
                  },
              ]
            : []),
        ...baseNavItems.slice(1), // Password, Two-Factor, Appearance
    ];

    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    return (
        <div className="px-4 py-6">
            <Heading
                title="Settings"
                description="Manage your profile and account settings"
            />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav
                        className="flex flex-col space-y-1 space-x-0"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${toUrl(item.href)}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': isCurrentUrl(item.href),
                                })}
                            >
                                <Link href={item.href}>
                                    {item.icon && (
                                        <item.icon className="h-4 w-4 mr-2" />
                                    )}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}