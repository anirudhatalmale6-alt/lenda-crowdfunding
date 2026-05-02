import { useState, useEffect } from 'react';
import { Network, ChevronDown, Check, AlertCircle, Loader } from 'lucide-react';
import { ethers } from 'ethers';

// Supported networks configuration
const SUPPORTED_NETWORKS = [
    {
        id: 1,
        name: 'Ethereum Mainnet',
        symbol: 'ETH',
        chainId: '0x1',
        explorer: 'https://etherscan.io',
        color: '#627EEA',
        rpcUrl: 'https://eth.llamarpc.com',
    },
    {
        id: 11155111,
        name: 'Sepolia Testnet',
        symbol: 'ETH',
        chainId: '0xaa36a7',
        explorer: 'https://sepolia.etherscan.io',
        color: '#3C3C3D',
        rpcUrl: 'https://rpc.sepolia.org',
    },
    {
        id: 5,
        name: 'Goerli Testnet',
        symbol: 'ETH',
        chainId: '0x5',
        explorer: 'https://goerli.etherscan.io',
        color: '#3099F2',
        rpcUrl: 'https://rpc.goerli.mudit.blog',
    },
    {
        id: 137,
        name: 'Polygon Mainnet',
        symbol: 'MATIC',
        chainId: '0x89',
        explorer: 'https://polygonscan.com',
        color: '#8247E5',
        rpcUrl: 'https://polygon-rpc.com',
    },
    {
        id: 80001,
        name: 'Mumbai Testnet',
        symbol: 'MATIC',
        chainId: '0x13881',
        explorer: 'https://mumbai.polygonscan.com',
        color: '#A855F7',
        rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    },
    {
        id: 56,
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        chainId: '0x38',
        explorer: 'https://bscscan.com',
        color: '#F3BA2F',
        rpcUrl: 'https://bsc-dataseed.binance.org',
    },
    {
        id: 97,
        name: 'BNB Testnet',
        symbol: 'BNB',
        chainId: '0x61',
        explorer: 'https://testnet.bscscan.com',
        color: '#F3BA2F',
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    },
];

/**
 * NetworkSwitcher - UI component for switching between blockchain networks
 * Allows users to connect to different chains
 * 
 * @param {Object} props
 * @param {Function} props.onNetworkChange - Callback when network changes
 * @param {boolean} props.showOnlyTestnets - Show only testnet options
 * @param {string} props.preferredNetwork - Preferred network ID
 */
function NetworkSwitcher({ 
    onNetworkChange = null, 
    showOnlyTestnets = false,
    preferredNetwork = null 
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentChainId, setCurrentChainId] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const [wallets, setWallets] = useState(null);

    useEffect(() => {
        checkCurrentNetwork();
        detectWallet();
    }, []);

    const detectWallet = async () => {
        if (typeof window !== 'undefined' && window.ethereum) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await provider.listAccounts();
                if (accounts.length > 0) {
                    setWallets({ provider, accounts });
                }
            } catch (err) {
                console.warn('Could not detect wallet:', err);
            }
        }
    };

    const checkCurrentNetwork = async () => {
        if (typeof window !== 'undefined' && window.ethereum) {
            try {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                setCurrentChainId(chainId);
            } catch (err) {
                console.warn('Could not get chain ID:', err);
            }
        }
    };

    const filteredNetworks = showOnlyTestnets 
        ? SUPPORTED_NETWORKS.filter(n => n.id !== 1 && n.id !== 137 && n.id !== 56)
        : SUPPORTED_NETWORKS;

    const currentNetwork = SUPPORTED_NETWORKS.find(
        n => n.chainId === currentChainId || `0x${n.id.toString(16)}` === currentChainId
    );

    const switchNetwork = async (network) => {
        if (!window.ethereum) {
            setError('No wallet detected. Please install MetaMask or another Web3 wallet.');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: network.chainId }],
            });

            setCurrentChainId(network.chainId);
            
            if (onNetworkChange) {
                onNetworkChange(network);
            }

            setIsOpen(false);
        } catch (switchError) {
            // Chain not added, add it
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: network.chainId,
                                chainName: network.name,
                                nativeCurrency: {
                                    name: network.symbol,
                                    symbol: network.symbol,
                                    decimals: 18,
                                },
                                rpcUrls: [network.rpcUrl],
                                blockExplorerUrls: [network.explorer],
                            },
                        ],
                    });

                    setCurrentChainId(network.chainId);
                    
                    if (onNetworkChange) {
                        onNetworkChange(network);
                    }

                    setIsOpen(false);
                } catch (addError) {
                    setError(`Failed to add network: ${addError.message}`);
                }
            } else {
                setError(`Failed to switch network: ${switchError.message}`);
            }
        } finally {
            setIsConnecting(false);
        }
    };

    const getCurrentNetworkInfo = () => {
        if (currentNetwork) {
            return currentNetwork;
        }
        
        if (currentChainId) {
            const found = SUPPORTED_NETWORKS.find(
                n => n.chainId === currentChainId
            );
            if (found) return found;
        }

        return {
            name: 'Unknown Network',
            symbol: '?',
            color: '#666',
            chainId: currentChainId,
        };
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isConnecting}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
                <Network className="w-4 h-4 text-slate-600" />
                <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCurrentNetworkInfo().color }}
                />
                <span className="text-sm font-medium text-slate-700">
                    {getCurrentNetworkInfo().name}
                </span>
                {isConnecting ? (
                    <Loader className="w-4 h-4 animate-spin text-slate-500" />
                ) : (
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
                        <div className="px-3 py-2 border-b border-slate-100">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Select Network
                            </h3>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mx-3 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <span className="text-xs text-red-700">{error}</span>
                            </div>
                        )}

                        {/* Network List */}
                        <div className="max-h-64 overflow-y-auto py-1">
                            {filteredNetworks.map((network) => {
                                const isActive = currentChainId === network.chainId || 
                                    `0x${network.id.toString(16)}` === currentChainId;

                                return (
                                    <button
                                        key={network.id}
                                        onClick={() => switchNetwork(network)}
                                        disabled={isConnecting}
                                        className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors disabled:opacity-50 ${
                                            isActive ? 'bg-primary-50' : ''
                                        }`}
                                    >
                                        <div 
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: network.color }}
                                        />
                                        <div className="flex-1 text-left">
                                            <div className="text-sm font-medium text-slate-900">
                                                {network.name}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {network.symbol} • Chain {network.id}
                                            </div>
                                        </div>
                                        {isActive && (
                                            <Check className="w-4 h-4 text-primary-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-2 border-t border-slate-100">
                            <p className="text-xs text-slate-400">
                                Your wallet will prompt for confirmation
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default NetworkSwitcher;
export { SUPPORTED_NETWORKS };
