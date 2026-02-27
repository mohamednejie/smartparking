import { router, usePage } from '@inertiajs/react';
import { LayoutGrid, Car, CalendarCheck } from 'lucide-react';

import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';
import AppLogo from './app-logo';
import { dashboard } from '@/routes';

// Adapte ce type à ta structure réelle de props
type PageProps = {
    auth: {
        user: {
            role: 'owner' | 'driver'; // ou string, ou ton enum
        };
    };
};

export function AppSidebar() {
    const { auth } = usePage<PageProps>().props;
    const userRole = auth.user.role;

    // Menu construit en fonction du rôle
    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        // "My Parkings" uniquement pour les owners
        ...(userRole === 'owner'
            ? [
                  {
                      title: 'My Parkings',
                      href: '/parkings',
                      icon: Car,
                  } as NavItem,
              ]
            : []),
        // "Booking" uniquement pour les drivers
        ...(userRole === 'driver'
            ? [
                  {
                      title: 'Booking',
                      href: '/parkings/available', // j’ai ajouté le / manquant
                      icon: CalendarCheck,
                  } as NavItem,
              ]
            : []),
    ];

    const goToDashboard = () => {
        router.visit(dashboard(), {
            preserveScroll: false,
            preserveState: false,
            replace: false,
        });
    };

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            type="button"
                            className="cursor-pointer"
                            onClick={goToDashboard}
                        >
                            <AppLogo />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}