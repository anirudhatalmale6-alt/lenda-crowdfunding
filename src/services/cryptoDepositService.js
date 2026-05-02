/**
 * CryptoDepositService - Service for generating real crypto deposit addresses
 * Uses deterministic wallet derivation for unique per-user addresses
 */

import { ethers } from 'ethers';

// Supported cryptocurrencies
export const SUPPORTED_CRYPTOS = {
    ETH: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        chainId: 1,
        explorer: 'https://etherscan.io',
    },
    ETH_SEPOLIA: {
        name: 'Ethereum (Sepolia)',
        symbol: 'ETH',
        decimals: 18,
        chainId: 11155111,
        explorer: 'https://sepolia.etherscan.io',
    },
    ETH_GOERLI: {
        name: 'Ethereum (Goerli)',
        symbol: 'ETH',
        decimals: 18,
        chainId: 5,
        explorer: 'https://goerli.etherscan.io',
    },
    BTC: {
        name: 'Bitcoin',
        symbol: 'BTC',
        decimals: 8,
        chainId: null,
        explorer: 'https://blockstream.info',
    },
    USDT: {
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        chainId: 1,
        contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        explorer: 'https://etherscan.io',
    },
    USDC: {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        chainId: 1,
        contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        explorer: 'https://etherscan.io',
    },
};

// Derivation path prefixes for different cryptocurrencies
export const DERIVATION_PATHS = {
    ETH: "m/44'/60'/0'/0/0",
    BTC: "m/44'/0'/0'/0/0",
    USDT: "m/44'/60'/0'/0/0",
    USDC: "m/44'/60'/0'/0/0",
};

// Ethereum HD Node utility for proper BIP-44 derivation
class CryptoDepositService {
    constructor() {
        this.masterWallet = null;
        this.depositAddresses = new Map();
        this.wallet = null;
        this.hdNode = null;
    }

    /**
     * Initialize with a master seed phrase or private key
     * In production, this would be a secure, hot-wallet service
     */
    async initialize(seedPhraseOrPrivateKey, provider = null) {
        try {
            if (seedPhraseOrPrivateKey) {
                if (seedPhraseOrPrivateKey.includes(' ') && seedPhraseOrPrivateKey.split(' ').length >= 12) {
                    // It's a seed phrase - derive HD wallet
                    if (provider) {
                        this.wallet = ethers.Wallet.fromPhrase(seedPhraseOrPrivateKey, provider);
                    } else {
                        this.wallet = ethers.Wallet.fromPhrase(seedPhraseOrPrivateKey);
                    }
                    // Create HD node from mnemonic
                    const mnemonic = ethers.Mnemonic.fromPhrase(seedPhraseOrPrivateKey);
                    this.hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic);
                } else {
                    // It's a private key
                    if (provider) {
                        this.wallet = new ethers.Wallet(seedPhraseOrPrivateKey, provider);
                    } else {
                        this.wallet = new ethers.Wallet(seedPhraseOrPrivateKey);
                    }
                    // Derive HD node from private key for proper derivation
                    this.hdNode = ethers.HDNodeWallet.fromPrivateKey(seedPhraseOrPrivateKey);
                }
            } else {
                // Generate a new wallet for this session (development only)
                this.wallet = ethers.Wallet.createRandom();
                if (provider) {
                    this.wallet = this.wallet.connect(provider);
                }
                const mnemonic = this.wallet.mnemonic;
                if (mnemonic) {
                    this.hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic);
                }
            }
            
            return {
                success: true,
                address: this.wallet.address,
                isDevelopment: !seedPhraseOrPrivateKey,
                hasHdNode: !!this.hdNode,
            };
        } catch (error) {
            console.error('Failed to initialize crypto deposit service:', error);
            // Fallback: create random wallet without HD
            this.wallet = ethers.Wallet.createRandom();
            return {
                success: true,
                address: this.wallet.address,
                isDevelopment: true,
                hasHdNode: false,
                warning: 'Using random wallet - HD derivation not available',
            };
        }
    }

    /**
     * Generate a unique deposit address for a user using BIP-44 derivation
     * Uses deterministic derivation based on user ID to ensure uniqueness
     * @param {string} userId - Unique user identifier
     * @param {string} crypto - Cryptocurrency symbol (e.g., 'ETH', 'USDT')
     * @returns {Object} Deposit address information
     */
    generateDepositAddress(userId, crypto = 'ETH') {
        const cryptoConfig = SUPPORTED_CRYPTOS[crypto];
        if (!cryptoConfig) {
            throw new Error(`Unsupported cryptocurrency: ${crypto}`);
        }

        let derivedAddress;
        let derivationPath;
        
        // Generate a unique index based on user ID hash
        const userHash = ethers.keccak256(ethers.toUtf8Bytes(userId));
        const addressIndex = parseInt(userHash.slice(2, 8), 16) % 10000; // 0-9999 range

        if (this.hdNode && DERIVATION_PATHS[crypto]) {
            // Use proper HD derivation with BIP-44
            try {
                // Derive path: m/44'/60'/0'/0/index
                const basePath = DERIVATION_PATHS[crypto].replace("/0/0", `/0/${addressIndex}`);
                const derivedNode = this.hdNode.derivePath(basePath);
                derivedAddress = derivedNode.address;
                derivationPath = basePath;
            } catch (err) {
                console.warn('HD derivation failed, using fallback:', err);
                // Fallback to deterministic address generation
                derivedAddress = this._deriveFallbackAddress(userId, crypto);
                derivationPath = `${DERIVATION_PATHS[crypto]}/${addressIndex}`;
            }
        } else {
            // Fallback: deterministic address generation without HD
            derivedAddress = this._deriveFallbackAddress(userId, crypto);
            derivationPath = `${DERIVATION_PATHS?.[crypto] || "m/44'/60'/0'/0/0"}/${addressIndex}`;
        }

        const addressInfo = {
            address: derivedAddress,
            crypto: crypto,
            symbol: cryptoConfig.symbol,
            name: cryptoConfig.name,
            userId: userId,
            derivationPath: derivationPath,
            addressIndex: addressIndex,
            createdAt: new Date().toISOString(),
            qrData: `${crypto.toLowerCase()}:${derivedAddress}`,
            isHD: !!this.hdNode,
        };

        // Cache the address
        const cacheKey = `${userId}-${crypto}`;
        this.depositAddresses.set(cacheKey, addressInfo);

        return addressInfo;
    }

    /**
     * Fallback address derivation using PBKDF2-like approach
     * Used when HD wallet is not available
     */
    _deriveFallbackAddress(userId, crypto) {
        // Create a deterministic seed from userId and crypto
        const seedMaterial = `${userId}-${crypto}-${this.wallet?.address || 'default'}`;
        const hash = ethers.keccak256(ethers.toUtf8Bytes(seedMaterial));
        
        // Use the hash to create a private key (ensure it's valid for secp256k1)
        const privateKey = '0x' + hash.slice(2, 34) + '01';
        
        try {
            const derivedWallet = new ethers.Wallet(privateKey);
            return derivedWallet.address;
        } catch (e) {
            // If derivation fails, return a formatted address from hash
            return ethers.computeAddress(privateKey);
        }
    }

    /**
     * Get deposit address for existing user
     * @param {string} userId - Unique user identifier
     * @param {string} crypto - Cryptocurrency symbol
     * @returns {Object|null} Deposit address or null if not found
     */
    getDepositAddress(userId, crypto = 'ETH') {
        const cacheKey = `${userId}-${crypto}`;
        return this.depositAddresses.get(cacheKey) || null;
    }

    /**
     * Get all deposit addresses for a user
     * @param {string} userId - Unique user identifier
     * @returns {Array} Array of deposit addresses
     */
    getAllDepositAddresses(userId) {
        const addresses = [];
        for (const [key, value] of this.depositAddresses.entries()) {
            if (key.startsWith(`${userId}-`)) {
                addresses.push(value);
            }
        }
        
        // Also generate addresses for all supported cryptos
        for (const crypto of Object.keys(SUPPORTED_CRYPTOS)) {
            if (!addresses.find(a => a.crypto === crypto)) {
                addresses.push(this.generateDepositAddress(userId, crypto));
            }
        }
        
        return addresses;
    }

    /**
     * Check if a transaction has been received at an address
     * @param {string} address - Deposit address to check
     * @param {string} crypto - Cryptocurrency
     * @returns {Object} Transaction check result
     */
    async checkDepositReceived(address, crypto = 'ETH') {
        const cryptoConfig = SUPPORTED_CRYPTOS[crypto];
        if (!cryptoConfig) {
            throw new Error(`Unsupported cryptocurrency: ${crypto}`);
        }

        return {
            address,
            crypto,
            hasReceived: false,
            balance: '0',
            requiresExternalCheck: true,
            message: 'Use getBalance() method with a provider to check actual balance',
        };
    }

    /**
     * Get balance for an address using a provider
     * @param {string} address - Address to check
     * @param {object} provider - Ethers provider
     * @param {string} crypto - Cryptocurrency
     * @returns {string} Balance in native units
     */
    async getBalance(address, provider, crypto = 'ETH') {
        const cryptoConfig = SUPPORTED_CRYPTOS[crypto];
        
        if (!provider) {
            throw new Error('Provider is required to check balance');
        }

        if (crypto === 'ETH' || crypto === 'ETH_SEPOLIA' || crypto === 'ETH_GOERLI') {
            const balance = await provider.getBalance(address);
            return {
                balance: balance.toString(),
                formatted: ethers.formatEther(balance),
                crypto: crypto,
            };
        }

        // For ERC-20 tokens, query the contract
        if ((crypto === 'USDT' || crypto === 'USDC') && cryptoConfig?.contractAddress) {
            try {
                const erc20Abi = [
                    'function balanceOf(address owner) view returns (uint256)',
                    'function decimals() view returns (uint8)'
                ];
                const tokenContract = new ethers.Contract(
                    cryptoConfig.contractAddress,
                    erc20Abi,
                    provider
                );
                const [balance, decimals] = await Promise.all([
                    tokenContract.balanceOf(address),
                    tokenContract.decimals()
                ]);
                return {
                    balance: balance.toString(),
                    formatted: ethers.formatUnits(balance, decimals),
                    crypto: crypto,
                };
            } catch (error) {
                console.warn('Failed to get token balance:', error);
                return {
                    balance: '0',
                    formatted: '0',
                    crypto: crypto,
                    error: error.message,
                };
            }
        }

        return {
            balance: '0',
            formatted: '0',
            crypto: crypto,
            message: 'Balance check requires compatible provider',
        };
    }

    /**
     * Get wallet address (for admin/platform use)
     * @returns {string} Platform wallet address
     */
    getPlatformAddress() {
        return this.wallet?.address || null;
    }

    /**
     * Get supported cryptocurrencies
     * @returns {Array} List of supported crypto configs
     */
    getSupportedCryptos() {
        return Object.values(SUPPORTED_CRYPTOS);
    }

    /**
     * Validate an address format
     * @param {string} address - Address to validate
     * @param {string} crypto - Cryptocurrency
     * @returns {boolean} Whether address is valid
     */
    isValidAddress(address, crypto = 'ETH') {
        try {
            if (crypto === 'BTC') {
                // Basic BTC address validation (simplified)
                return /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
            }
            return ethers.isAddress(address);
        } catch {
            return false;
        }
    }

    /**
     * Generate a receive QR code URL
     * @param {string} address - Wallet address
     * @param {number} amount - Optional amount in crypto
     * @param {string} crypto - Cryptocurrency
     * @returns {string} QR code data URL
     */
    generateQRCodeData(address, amount = null, crypto = 'ETH') {
        let uri = `${crypto.toLowerCase()}:${address}`;
        
        if (amount) {
            uri += `?value=${amount}`;
        }
        
        return uri;
    }
}

// Export singleton instance
const cryptoDepositService = new CryptoDepositService();
export default cryptoDepositService;
