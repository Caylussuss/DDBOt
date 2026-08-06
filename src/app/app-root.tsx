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

// Races a promise against a timeout; resolves with fallback if timeout fires first.
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
    ]);
}

const AppRoot = () => {
    const store = useStore();
    const api_base_initialized = useRef(false);
    const [is_api_initialized, setIsApiInitialized] = useState(false);
    const [is_tmb_check_complete, setIsTmbCheckComplete] = useState(false);
    const [, setIsTmbEnabled] = useState(false);
    const { isTmbEnabled } = useTMB();

    // Top-level safety net: if the TMB check or API init stalls for any reason,
    // unblock the app after 10 seconds so the loading spinner never hangs forever.
    useEffect(() => {
        const safetyTimeout = setTimeout(() => {
            setIsTmbCheckComplete(true);
            setIsApiInitialized(true);
        }, 10000);
        return () => clearTimeout(safetyTimeout);
    }, []);

    // Effect to check TMB status - independent of API initialization
    useEffect(() => {
        const checkTmbStatus = async () => {
            try {
                // Cap the Firebase fetch at 5 s so a network stall can't block the app forever.
                const tmb_status = await withTimeout(isTmbEnabled(), 5000, false);
                const final_status = tmb_status || window.is_tmb_enabled === true;

                setIsTmbEnabled(final_status);

                setIsTmbCheckComplete(true);
            } catch (error) {
                console.error('TMB check failed:', error);
                setIsTmbCheckComplete(true);
            }
        };

        checkTmbStatus();
    }, []);

    // Initialize API when TMB check is complete with timeout fallback
    useEffect(() => {
        if (!is_tmb_check_complete) {
            return; // Wait until TMB check is complete
        }

        const timeoutId = setTimeout(() => {
            if (!is_api_initialized) {
                setIsApiInitialized(true);
            }
        }, 5000);

        const initializeApi = async () => {
            if (!api_base_initialized.current) {
                try {
                    await api_base.init();
                    api_base_initialized.current = true;
                } catch (error) {
                    console.error('API initialization failed:', error);
                    api_base_initialized.current = false;
                } finally {
                    setIsApiInitialized(true);
                    clearTimeout(timeoutId); // Clear timeout if API init completes
                }
            }
        };

        initializeApi();
        return () => clearTimeout(timeoutId);
    }, [is_tmb_check_complete]);

    if (!store || !is_api_initialized) return <AppRootLoader />;

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
