import { router } from '@inertiajs/react';
import { LayoutGrid,Car } from 'lucide-react';

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

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(), // NavMain peut utiliser router.visit(href)
        icon: LayoutGrid,
    },
      {
        title: 'My Parkings',
        href: '/parkings',
        icon: Car,
    },
];

export function AppSidebar() {
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
                        {/* Bouton qui utilise directement le router Inertia */}
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
                {/* NavMain peut continuer à utiliser Link(href) côté interne */}
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}