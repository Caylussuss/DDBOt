import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import ErrorBoundary from '@/components/error-component/error-boundary';
import ErrorComponent from '@/components/error-component/error-component';
import ChunkLoader from '@/components/loader/chunk-loader';
import { api_base } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import useTMB from '@/hooks/useTMB';
import { localize } from '@deriv-com/translations';
import './app-root.scss';

const AppContent = lazy(() => import('./app-content'));

const AppRootLoader = () => {
    return <ChunkLoader message={localize('Loading...')} />;
};

const ErrorComponentWrapper = observer(() => {
    const { common } = useStore();

    if (!common.error) return null;

    return (
        <ErrorComponent
            header={common.error?.header}
            message={common.error?.message}
            redirect_label={common.error?.redirect_label}
            redirectOnClick={common.error?.redirectOnClick}
            should_clear_error_on_click={common.error?.should_clear_error_on_click}
            setError={common.setError}
            redirect_to={common.error?.redirect_to}
            should_redirect={common.error?.should_redirect}
        />
    );
});

const AppRoot = () => {
    const store = useStore();
    const api_base_initialized = useRef(false);
    const [is_ready, setIsReady] = useState(false);
    const { isTmbEnabled } = useTMB();

    useEffect(() => {
        let cancelled = false;

        // Hard cap: never block the user for more than 4 seconds total,
        // regardless of what external services do.
        const hard_limit = setTimeout(() => {
            if (!cancelled) setIsReady(true);
        }, 4000);

        const run = async () => {
            // Run TMB check and API init in PARALLEL — neither blocks the other.
            // TMB check is capped at 2 s; if Firebase is unreachable the app
            // falls back to is_tmb_enabled=false and continues immediately.
            const tmbCheck = (async () => {
                try {
                    const controller = new AbortController();
                    const tid = setTimeout(() => controller.abort(), 2000);
                    const url = window.location.hostname.includes('staging')
                        ? 'https://app-config-staging.firebaseio.com/remote_config/oauth/is_tmb_enabled.json'
                        : 'https://app-config-prod.firebaseio.com/remote_config/oauth/is_tmb_enabled.json';

                    // Honor localStorage override before hitting the network.
                    const stored = localStorage.getItem('is_tmb_enabled');
                    if (stored === 'true') {
                        clearTimeout(tid);
                        window.is_tmb_enabled = true;
                        return;
                    } else if (stored === 'false') {
                        clearTimeout(tid);
                        window.is_tmb_enabled = false;
                        return;
                    }

                    // Also try isTmbEnabled() from the hook (uses cached promise if already in-flight).
                    await Promise.race([
                        isTmbEnabled(),
                        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 2000)),
                    ]);
                    clearTimeout(tid);
                } catch {
                    // TMB unavailable — default to disabled; app continues normally.
                    window.is_tmb_enabled = false;
                }
            })();

            const apiInit = (async () => {
                if (api_base_initialized.current) return;
                try {
                    await api_base.init();
                    api_base_initialized.current = true;
                } catch {
                    // API init failed — app still renders; connection retries handle recovery.
                }
            })();

            // Wait for whichever finishes last, but no longer than 3 s combined.
            await Promise.race([
                Promise.all([tmbCheck, apiInit]),
                new Promise<void>(resolve => setTimeout(resolve, 3000)),
            ]);

            if (!cancelled) {
                clearTimeout(hard_limit);
                setIsReady(true);
            }
        };

        run();

        return () => {
            cancelled = true;
            clearTimeout(hard_limit);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!store || !is_ready) return <AppRootLoader />;

    return (
        <Suspense fallback={<AppRootLoader />}>
            <ErrorBoundary root_store={store}>
                <ErrorComponentWrapper />
                <AppContent />
            </ErrorBoundary>
        </Suspense>
    );
};

export default AppRoot;
