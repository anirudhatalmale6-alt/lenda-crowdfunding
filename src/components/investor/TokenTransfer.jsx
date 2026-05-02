import { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    Send,
    Wallet,
    ExternalLink,
    AlertCircle,
    CheckCircle,
    Loader,
    X,
    Copy,
    QrCode,
    Shield,
    ArrowRight
} from 'lucide-react';

/**
 * TokenTransfer - Component for transferring tokens to external wallets
 * Addresses FEAT-008: Token Transfer to external wallets
 */
function TokenTransfer({ onTransfer, onCancel }) {
    const { tokenHoldings } = useSelector(state => state.tokens);
    const { wallet } = useSelector(state => state.wallet);
    const { user } = useSelector(state => state.auth);
    
    const [step, setStep] = useState(1); // 1: Select, 2: Details, 3: Confirm, 4: Success
    const [selectedToken, setSelectedToken] = useState(null);
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState('');
    const [confirmAddress, setConfirmAddress] = useState('');
    const [transferring, setTransferring] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    // Mock token holdings
    const holdings = [
        { id: 1, loanId: 101, loanTitle: 'Business Expansion Loan', tokenCount: 100, tokenPrice: 1.10, totalValue: 110 },
        { id: 2, loanId: 102, loanTitle: 'Equipment Financing', tokenCount: 50, tokenPrice: 1.05, totalValue: 52.50 },
        { id: 3, loanId: 103, loanTitle: 'Working Capital', tokenCount: 200, tokenPrice: 0.98, totalValue: 196 },
    ];
    
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };
    
    const validateAddress = (address) => {
        // Basic Ethereum address validation (0x followed by 40 hex characters)
        const ethRegex = /^0x[a-fA-F0-9]{40}$/;
        return ethRegex.test(address);
    };
    
    const handleSelectToken = (token) => {
        setSelectedToken(token);
        setAmount(token.tokenCount.toString());
        setStep(2);
    };
    
    const handleProceedToConfirm = () => {
        if (!validateAddress(recipientAddress)) {
            toast.error('Invalid recipient address');
            return;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        
        if (selectedToken && parseFloat(amount) > selectedToken.tokenCount) {
            toast.error('Insufficient token balance');
            return;
        }
        
        setStep(3);
    };
    
    const handleTransfer = async () => {
        if (confirmAddress.toLowerCase() !== recipientAddress.toLowerCase()) {
            toast.error('Address confirmation does not match');
            return;
        }
        
        setTransferring(true);
        
        try {
            // Simulate blockchain transfer
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            setStep(4);
            toast.success('Transfer initiated successfully!');
            
            if (onTransfer) {
                onTransfer({
                    tokenId: selectedToken.id,
                    recipient: recipientAddress,
                    amount: parseFloat(amount),
                    memo,
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            toast.error(error.message || 'Transfer failed');
        }
        
        setTransferring(false);
    };
    
    const copyAddress = (address) => {
        navigator.clipboard.writeText(address);
        toast.success('Address copied to clipboard');
    };
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Send className="w-6 h-6 text-primary-500" />
                        Transfer Tokens
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Send your LENDA tokens to external wallets
                    </p>
                </div>
            </div>
            
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                            step >= s 
                                ? 'bg-primary-500 text-white' 
                                : 'bg-slate-200 text-slate-500'
                        }`}>
                            {step > s ? '✓' : s}
                        </div>
                        {s < 4 && (
                            <div className={`w-16 h-1 ${step > s ? 'bg-primary-500' : 'bg-slate-200'}`} />
                        )}
                    </div>
                ))}
            </div>
            
            {/* Step 1: Select Token */}
            {step === 1 && (
                <div className="card p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Select Token to Transfer</h3>
                    
                    {holdings.length === 0 ? (
                        <div className="text-center py-8">
                            <Wallet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No tokens available to transfer</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {holdings.map((token) => (
                                <button
                                    key={token.id}
                                    onClick={() => handleSelectToken(token)}
                                    className="w-full p-4 border border-slate-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-slate-900">{token.loanTitle}</p>
                                            <p className="text-sm text-slate-500">Loan #{token.loanId}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-primary-600">{token.tokenCount} tokens</p>
                                            <p className="text-sm text-slate-500">{formatCurrency(token.totalValue)}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* Step 2: Enter Details */}
            {step === 2 && selectedToken && (
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900">Transfer Details</h3>
                        <button 
                            onClick={() => setStep(1)}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    {/* Selected Token */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">{selectedToken.loanTitle}</p>
                                <p className="text-sm text-slate-500">Available: {selectedToken.tokenCount} tokens</p>
                            </div>
                            <button 
                                onClick={() => setStep(1)}
                                className="text-primary-600 text-sm hover:underline"
                            >
                                Change
                            </button>
                        </div>
                    </div>
                    
                    {/* Recipient Address */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Recipient Wallet Address *
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                placeholder="0x..."
                                className="input-field w-full font-mono text-sm"
                            />
                            <button
                                onClick={() => setShowQR(true)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                title="Scan QR Code"
                            >
                                <QrCode className="w-5 h-5" />
                            </button>
                        </div>
                        {recipientAddress && !validateAddress(recipientAddress) && (
                            <p className="text-red-500 text-sm mt-1">Invalid Ethereum address format</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                            Only ERC-20 compatible addresses are supported
                        </p>
                    </div>
                    
                    {/* Amount */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Amount (tokens) *
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                min={0.01}
                                max={selectedToken.tokenCount}
                                step={0.01}
                                className="input-field w-full"
                            />
                            <button
                                onClick={() => setAmount(selectedToken.tokenCount)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary-600 hover:underline"
                            >
                                MAX
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Available: {selectedToken.tokenCount} tokens ({formatCurrency(selectedToken.totalValue)})
                        </p>
                    </div>
                    
                    {/* Advanced Options */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-sm text-primary-600 hover:text-primary-700 mb-4"
                    >
                        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                    </button>
                    
                    {showAdvanced && (
                        <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Memo (optional)
                            </label>
                            <input
                                type="text"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                placeholder="Add a note for this transfer"
                                className="input-field w-full"
                                maxLength={100}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                This memo will be recorded on the blockchain
                            </p>
                        </div>
                    )}
                    
                    {/* Transfer Summary */}
                    {amount && recipientAddress && validateAddress(recipientAddress) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <h4 className="font-medium text-blue-900 mb-2">Transfer Summary</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-blue-700">Amount:</span>
                                    <span className="font-medium">{amount} tokens</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-700">Estimated Value:</span>
                                    <span className="font-medium">{formatCurrency(parseFloat(amount) * selectedToken.tokenPrice)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-700">Network Fee:</span>
                                    <span className="font-medium">~$0.50 (estimated)</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <button
                        onClick={handleProceedToConfirm}
                        disabled={!recipientAddress || !amount || !validateAddress(recipientAddress)}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        Continue <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}
            
            {/* Step 3: Confirm */}
            {step === 3 && (
                <div className="card p-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-amber-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Confirm Transfer</h3>
                        <p className="text-slate-500 mt-1">Please verify all details before confirming</p>
                    </div>
                    
                    {/* Transfer Details */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                        <div className="space-y-3">
                            <div>
                                <span className="text-sm text-slate-500">Sending</span>
                                <p className="font-medium">{amount} tokens from {selectedToken.loanTitle}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">To Address</span>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono text-sm">{recipientAddress}</p>
                                    <button 
                                        onClick={() => copyAddress(recipientAddress)}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {memo && (
                                <div>
                                    <span className="text-sm text-slate-500">Memo</span>
                                    <p className="font-medium">{memo}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Confirm Address Input */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Type the recipient address to confirm *
                        </label>
                        <input
                            type="text"
                            value={confirmAddress}
                            onChange={(e) => setConfirmAddress(e.target.value)}
                            placeholder="Enter recipient address"
                            className="input-field w-full font-mono text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Type the address exactly as shown above
                        </p>
                    </div>
                    
                    {/* Warning */}
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            <div className="text-sm text-red-700">
                                <p className="font-medium">Important Warning</p>
                                <p className="text-xs mt-1">
                                    Cryptocurrency transactions are irreversible. 
                                    Please double-check the recipient address. 
                                    Incorrect transfers cannot be recovered.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(2)}
                            className="btn-secondary flex-1"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleTransfer}
                            disabled={transferring || confirmAddress.toLowerCase() !== recipientAddress.toLowerCase()}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {transferring ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Transferring...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Confirm & Transfer
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
            
            {/* Step 4: Success */}
            {step === 4 && (
                <div className="card p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Transfer Initiated!</h3>
                    <p className="text-slate-500 mt-1 mb-6">
                        Your transfer has been submitted to the blockchain
                    </p>
                    
                    {/* Transaction Details */}
                    <div className="bg-slate-50 rounded-lg p-4 text-left mb-6">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Amount:</span>
                                <span className="font-medium">{amount} tokens</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">To:</span>
                                <span className="font-mono text-xs">{recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Status:</span>
                                <span className="text-amber-600 font-medium">Pending Confirmation</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setStep(1);
                                setSelectedToken(null);
                                setRecipientAddress('');
                                setAmount('');
                                setConfirmAddress('');
                            }}
                            className="btn-primary flex-1"
                        >
                            Transfer More
                        </button>
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                className="btn-secondary flex-1"
                            >
                                Done
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            {/* QR Modal */}
            {showQR && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Scan QR Code</h3>
                            <button 
                                onClick={() => setShowQR(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="bg-slate-100 rounded-lg p-8 text-center">
                            <QrCode className="w-32 h-32 mx-auto text-slate-400" />
                            <p className="text-sm text-slate-500 mt-4">
                                QR code scanner would appear here
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TokenTransfer;
