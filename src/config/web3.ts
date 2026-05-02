/**
 * LENDA Web3 Configuration
 * 
 * Environment-based configuration for smart contracts across different networks
 * Supports local development, testnets, and mainnet
 */

export interface NetworkConfig {
    chainId: number;
    name: string;
    rpcUrl: string;
    explorerUrl: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
}

export interface ContractAddresses {
    // Core Contracts
    loanToken: string;
    escrow: string;
    collateral: string;
    
    // Token Contracts
    lendToken: string;
    stablecoin: string;
    
    // Additional Contracts
    priceOracle: string;
    reserveFund: string;
}

export interface Web3Config {
    network: NetworkConfig;
    contracts: ContractAddresses;
    options: {
        defaultGasLimit: number;
        defaultGasPrice: number;
        confirmationBlocks: number;
        timeout: number;
    };
}

/**
 * Network configurations by environment/network
 */
export const NETWORKS: Record<string, NetworkConfig> = {
    // Local Development Networks
    hardhat: {
        chainId: 31337,
        name: 'Hardhat Local',
        rpcUrl: process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545',
        explorerUrl: '',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        }
    },
    localhost: {
        chainId: 31337,
        name: 'Localhost',
        rpcUrl: process.env.LOCALHOST_RPC_URL || 'http://127.0.0.1:8545',
        explorerUrl: '',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        }
    },
    
    // Test Networks
    sepolia: {
        chainId: 11155111,
        name: 'Sepolia Testnet',
        rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
        explorerUrl: 'https://sepolia.etherscan.io',
        nativeCurrency: {
            name: 'Sepolia Ether',
            symbol: 'SEP',
            decimals: 18
        }
    },
    goerli: {
        chainId: 5,
        name: 'Goerli Testnet',
        rpcUrl: process.env.GOERLI_RPC_URL || 'https://rpc.goerli.org',
        explorerUrl: 'https://goerli.etherscan.io',
        nativeCurrency: {
            name: 'Goerli Ether',
            symbol: 'GETH',
            decimals: 18
        }
    },
    
    // Main Networks
    mainnet: {
        chainId: 1,
        name: 'Ethereum Mainnet',
        rpcUrl: process.env.MAINNET_RPC_URL || 'https://rpc.ankr.com/eth',
        explorerUrl: 'https://etherscan.io',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        }
    },
    polygon: {
        chainId: 137,
        name: 'Polygon Mainnet',
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://rpc.ankr.com/polygon',
        explorerUrl: 'https://polygonscan.com',
        nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18
        }
    }
};

/**
 * Contract addresses by network
 */
export const CONTRACT_ADDRESSES: Record<string, ContractAddresses> = {
    hardhat: {
        loanToken: process.env.LOCAL_LOAN_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        escrow: process.env.LOCAL_ESCROW_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb142E18a33EB7A',
        collateral: process.env.LOCAL_COLLATERAL_ADDRESS || '0x0DCd1Bf9A1b36cE34297e22F215238055A3a0B5',
        lendToken: process.env.LOCAL_LEND_TOKEN_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        stablecoin: process.env.LOCAL_STABLECOIN_ADDRESS || '0x2279B7A0a67DB72c27b5F6D4521F7C91A2dA8f6E',
        priceOracle: process.env.LOCAL_PRICE_ORACLE_ADDRESS || '0x8A791620dd6260079BF84975255670d8256D693',
        reserveFund: process.env.LOCAL_RESERVE_FUND_ADDRESS || '0x610178dA211FEF7f4179020DF5EA5651a3220F0D'
    },
    localhost: {
        loanToken: process.env.LOCAL_LOAN_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        escrow: process.env.LOCAL_ESCROW_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb142E18a33EB7A',
        collateral: process.env.LOCAL_COLLATERAL_ADDRESS || '0x0DCd1Bf9A1b36cE34297e22F215238055A3a0B5',
        lendToken: process.env.LOCAL_LEND_TOKEN_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        stablecoin: process.env.LOCAL_STABLECOIN_ADDRESS || '0x2279B7A0a67DB72c27b5F6D4521F7C91A2dA8f6E',
        priceOracle: process.env.LOCAL_PRICE_ORACLE_ADDRESS || '0x8A791620dd6260079BF84975255670d8256D693',
        reserveFund: process.env.LOCAL_RESERVE_FUND_ADDRESS || '0x610178dA211FEF7f4179020DF5EA5651a3220F0D'
    },
    sepolia: {
        loanToken: process.env.SEPOLIA_LOAN_TOKEN_ADDRESS || '',
        escrow: process.env.SEPOLIA_ESCROW_ADDRESS || '',
        collateral: process.env.SEPOLIA_COLLATERAL_ADDRESS || '',
        lendToken: process.env.SEPOLIA_LEND_TOKEN_ADDRESS || '',
        stablecoin: process.env.SEPOLIA_STABLECOIN_ADDRESS || '',
        priceOracle: process.env.SEPOLIA_PRICE_ORACLE_ADDRESS || '',
        reserveFund: process.env.SEPOLIA_RESERVE_FUND_ADDRESS || ''
    },
    goerli: {
        loanToken: process.env.GOERLI_LOAN_TOKEN_ADDRESS || '',
        escrow: process.env.GOERLI_ESCROW_ADDRESS || '',
        collateral: process.env.GOERLI_COLLATERAL_ADDRESS || '',
        lendToken: process.env.GOERLI_LEND_TOKEN_ADDRESS || '',
        stablecoin: process.env.GOERLI_STABLECOIN_ADDRESS || '',
        priceOracle: process.env.GOERLI_PRICE_ORACLE_ADDRESS || '',
        reserveFund: process.env.GOERLI_RESERVE_FUND_ADDRESS || ''
    },
    mainnet: {
        loanToken: process.env.MAINNET_LOAN_TOKEN_ADDRESS || '',
        escrow: process.env.MAINNET_ESCROW_ADDRESS || '',
        collateral: process.env.MAINNET_COLLATERAL_ADDRESS || '',
        lendToken: process.env.MAINNET_LEND_TOKEN_ADDRESS || '',
        stablecoin: process.env.MAINNET_STABLECOIN_ADDRESS || '',
        priceOracle: process.env.MAINNET_PRICE_ORACLE_ADDRESS || '',
        reserveFund: process.env.MAINNET_RESERVE_FUND_ADDRESS || ''
    },
    polygon: {
        loanToken: process.env.POLYGON_LOAN_TOKEN_ADDRESS || '',
        escrow: process.env.POLYGON_ESCROW_ADDRESS || '',
        collateral: process.env.POLYGON_COLLATERAL_ADDRESS || '',
        lendToken: process.env.POLYGON_LEND_TOKEN_ADDRESS || '',
        stablecoin: process.env.POLYGON_STABLECOIN_ADDRESS || '',
        priceOracle: process.env.POLYGON_PRICE_ORACLE_ADDRESS || '',
        reserveFund: process.env.POLYGON_RESERVE_FUND_ADDRESS || ''
    }
};

/**
 * Default Web3 configuration
 */
export const DEFAULT_WEB3_OPTIONS = {
    defaultGasLimit: 500000,
    defaultGasPrice: 20000000000, // 20 Gwei
    confirmationBlocks: 2,
    timeout: 60000 // 1 minute
};

/**
 * Get Web3 configuration based on environment
 */
export function getWeb3Config(network?: string): Web3Config {
    const envNetwork = network || process.env.NETWORK || 'hardhat';
    
    const networkConfig = NETWORKS[envNetwork];
    if (!networkConfig) {
        throw new Error(`Unknown network: ${envNetwork}. Available: ${Object.keys(NETWORKS).join(', ')}`);
    }
    
    const contracts = CONTRACT_ADDRESSES[envNetwork];
    if (!contracts) {
        throw new Error(`No contract addresses for network: ${envNetwork}`);
    }
    
    return {
        network: networkConfig,
        contracts,
        options: {
            ...DEFAULT_WEB3_OPTIONS,
            defaultGasLimit: parseInt(process.env.DEFAULT_GAS_LIMIT || '') || DEFAULT_WEB3_OPTIONS.defaultGasLimit,
            defaultGasPrice: parseInt(process.env.DEFAULT_GAS_PRICE || '') || DEFAULT_WEB3_OPTIONS.defaultGasPrice,
            confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || '') || DEFAULT_WEB3_OPTIONS.confirmationBlocks,
            timeout: parseInt(process.env.WEB3_TIMEOUT || '') || DEFAULT_WEB3_OPTIONS.timeout
        }
    };
}

/**
 * Get contract address for a specific contract type
 */
export function getContractAddress(contractType: keyof ContractAddresses, network?: string): string {
    const config = getWeb3Config(network);
    return config.contracts[contractType];
}

/**
 * Check if a contract is deployed on the current network
 */
export function isContractDeployed(contractType: keyof ContractAddresses, network?: string): boolean {
    const address = getContractAddress(contractType, network);
    return address !== '' && address !== undefined;
}

/**
 * Get all deployed contracts for a network
 */
export function getDeployedContracts(network?: string): ContractAddresses {
    const config = getWeb3Config(network);
    return config.contracts;
}

export default {
    NETWORKS,
    CONTRACT_ADDRESSES,
    DEFAULT_WEB3_OPTIONS,
    getWeb3Config,
    getContractAddress,
    isContractDeployed,
    getDeployedContracts
};
