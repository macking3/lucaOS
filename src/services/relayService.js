import localtunnel from 'localtunnel';

class RelayService {
    constructor() {
        this.tunnel = null;
        this.publicUrl = null;
        this.isRelayActive = false;
    }

    /**
     * Start the Global Relay
     * @param {number} port - The local port to expose (default: 3001)
     * @returns {Promise<string>} - The public URL
     */
    async start(port = process.env.SERVER_PORT || process.env.PORT || 3002) {
        if (this.tunnel) {
            return this.publicUrl;
        }

        console.log(`[RELAY] Starting Global Relay for port ${port}...`);

        try {
            this.tunnel = await localtunnel({ port });
            this.publicUrl = this.tunnel.url;
            this.isRelayActive = true;

            console.log(`[RELAY] Global Relay Active: ${this.publicUrl}`);

            this.tunnel.on('close', () => {
                console.log('[RELAY] Tunnel closed');
                this.isRelayActive = false;
                this.tunnel = null;
                this.publicUrl = null;
            });

            return this.publicUrl;
        } catch (error) {
            console.error('[RELAY] Failed to start tunnel:', error);
            throw error;
        }
    }

    /**
     * Stop the Global Relay
     */
    stop() {
        if (this.tunnel) {
            console.log('[RELAY] Stopping Global Relay...');
            this.tunnel.close();
            this.tunnel = null;
            this.publicUrl = null;
            this.isRelayActive = false;
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            active: this.isRelayActive,
            url: this.publicUrl
        };
    }
}

export const relayService = new RelayService();
