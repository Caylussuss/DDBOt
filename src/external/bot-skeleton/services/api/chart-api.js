import { generateDerivApiInstance } from './appId';

class ChartAPI {
    api;
    // Exponential back-off state for chart reconnects
    reconnect_delay = 1000;
    reconnect_timer = null;

    onsocketopen() {
        // Reset back-off on successful connection.
        this.reconnect_delay = 1000;
        if (this.reconnect_timer) {
            clearTimeout(this.reconnect_timer);
            this.reconnect_timer = null;
        }
    }

    onsocketclose() {
        this.reconnectIfNotConnected();
    }

    init = async (force_create_connection = false) => {
        if (!this.api || force_create_connection) {
            if (this.api?.connection) {
                this.api.disconnect();
                this.api.connection.removeEventListener('open', this.onsocketopen.bind(this));
                this.api.connection.removeEventListener('close', this.onsocketclose.bind(this));
            }
            this.api = await generateDerivApiInstance();
            this.api?.connection.addEventListener('open', this.onsocketopen.bind(this));
            this.api?.connection.addEventListener('close', this.onsocketclose.bind(this));
        }
        this.getTime();
    };

    getTime() {
        if (!this.time_interval) {
            this.time_interval = setInterval(() => {
                this.api.send({ time: 1 });
            }, 30000);
        }
    }

    reconnectIfNotConnected = () => {
        // eslint-disable-next-line no-console
        console.log('chart connection state: ', this.api?.connection?.readyState);
        if (this.api?.connection?.readyState && this.api?.connection?.readyState > 1) {
            // Guard: don't schedule a second reconnect while one is already pending.
            if (this.reconnect_timer) return;
            // eslint-disable-next-line no-console
            console.log(`Info: Chart connection closed, reconnecting in ${this.reconnect_delay}ms`);
            this.reconnect_timer = setTimeout(() => {
                this.reconnect_timer = null;
                this.init(true);
            }, this.reconnect_delay);
            // Exponential back-off: 1 s → 2 s → 4 s → … capped at 30 s.
            this.reconnect_delay = Math.min(this.reconnect_delay * 2, 30000);
        }
    };
}

const chart_api = new ChartAPI();

export default chart_api;
