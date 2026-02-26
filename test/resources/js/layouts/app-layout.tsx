import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { AppLayoutProps } from '@/types';
import { Toaster } from 'sonner';


export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
        {children}
         <Toaster 
                position="top-right"
                richColors
                closeButton
                duration={2000}
                toastOptions={{
                    className: 'bg-white text-gray-800 shadow-lg rounded-lg',
                    success: {
                        icon: '✅',
                    },
                    error: {
                        icon: '❌',
                    },
                }}
            />
    </AppLayoutTemplate>
);
