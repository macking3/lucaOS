
import { ethers } from 'ethers';
import { SecureVault } from './secureVault.js';

const vault = new SecureVault(); // Uses internal default master key or env

export class CryptoService {
    constructor() {
        this.providers = {
            'ethereum': new ethers.JsonRpcProvider('https://eth.llamarpc.com'),
            'polygon': new ethers.JsonRpcProvider('https://polygon-rpc.com'),
            'base': new ethers.JsonRpcProvider('https://mainnet.base.org')
        };
    }

    getProvider(chain = 'ethereum') {
        const p = this.providers[chain.toLowerCase()];
        if (!p) throw new Error(`Unsupported chain: ${chain}`);
        return p;
    }

    /**
     * Generate a new wallet and store it securely
     */
    async createWallet(chain = 'ethereum', alias) {
        const wallet = ethers.Wallet.createRandom();
        const address = wallet.address;
        const privateKey = wallet.privateKey;
        const mnemonic = wallet.mnemonic.phrase;

        // Store private key in Vault
        const vaultKey = `wallet_${chain}_${alias || address.slice(0, 6)}`;
        await vault.store(vaultKey, address, privateKey, {
            chain,
            mnemonic,
            type: 'evm_wallet',
            created: Date.now()
        });

        return {
            address,
            mnemonic,
            vaultKey
        };
    }

    /**
     * Get balance of an address
     */
    async getBalance(chain, address) {
        const provider = this.getProvider(chain);
        const balance = await provider.getBalance(address);
        return {
            address,
            balance: ethers.formatEther(balance),
            symbol: 'ETH' // Simplified
        };
    }

    /**
     * Send Transaction (Requires User PIN/Confirmation typically, for now we assume Autonomy Level 5)
     */
    async sendTransaction(chain, vaultKey, to, amount) {
        // Retrieve Private Key
        const creds = await vault.retrieve(vaultKey);
        if (!creds.success) throw new Error(`Wallet not found: ${vaultKey}`);

        const provider = this.getProvider(chain);
        const wallet = new ethers.Wallet(creds.password, provider);

        const tx = await wallet.sendTransaction({
            to,
            value: ethers.parseEther(amount.toString())
        });

        return tx;
    }

    /**
     * List managed wallets
     */
    async listWallets() {
        const list = await vault.list();
        return list.filter(i => i.site.startsWith('wallet_'));
    }
}

export const cryptoService = new CryptoService();
