import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { initializeTheme } from './hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Récupération de l'utilisateur depuis les props Inertia
        const auth = (props.initialPage.props as any).auth;
        const currentPath = window.location.pathname;

        // Pages protégées (ajoute ici d'autres prefixes si besoin)
        const protectedPages = ['/dashboard', '/settings'];
        const isProtectedPage = protectedPages.some((p) =>
            currentPath.startsWith(p),
        );

        // Si page protégée et pas d'utilisateur → Redirection SPA vers /login
        if (isProtectedPage && !auth?.user) {
            router.visit('/login', {
                replace: true,        // remplace l'URL dans l'historique
                preserveState: false, // on ne garde pas l'état courant
                preserveScroll: false,
            });
            return;
        }

        root.render(
            <StrictMode>
                <App {...props} />
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// Gestion du thème (dark / light)
initializeTheme();