/**
 * Contract ABIs
 * 
 * CODE-002: Separate ABIs from web3Service to reduce file size
 * Centralized ABI definitions for all smart contracts
 */

// LendaLoan Contract ABI (key functions)
export const LENDA_LOAN_ABI = [
    // Enums
    {
        "inputs": [],
        "name": "LoanStatus",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint8" }],
    },
    // Structs
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "loans",
        "type": "function",
        "constant": true,
        "outputs": [
            { "name": "id", "type": "uint256" },
            { "name": "borrower", "type": "address" },
            { "name": "lenders", "type": "address[]" },
            { "name": "loanAmount", "type": "uint256" },
            { "name": "interestRate", "type": "uint256" },
            { "name": "durationMonths", "type": "uint256" },
            { "name": "fundedAmount", "type": "uint256" },
            { "name": "repaidAmount", "type": "uint256" },
            { "name": "status", "type": "uint8" },
            { "name": "collateralId", "type": "uint256" },
            { "name": "createdAt", "type": "uint256" },
            { "name": "fundedAt", "type": "uint256" },
            { "name": "fullyFundedAt", "type": "uint256" },
            { "name": "dueDate", "type": "uint256" },
            { "name": "defaultDate", "type": "uint256" },
        ],
    },
    {
        "inputs": [{ "name": "_collateralId", "type": "uint256" }],
        "name": "collaterals",
        "type": "function",
        "constant": true,
        "outputs": [
            { "name": "id", "type": "uint256" },
            { "name": "owner", "type": "address" },
            { "name": "loanId", "type": "uint256" },
            { "name": "collateralType", "type": "string" },
            { "name": "estimatedValue", "type": "uint256" },
            { "name": "documentHash", "type": "string" },
            { "name": "isVerified", "type": "bool" },
            { "name": "isLocked", "type": "bool" },
            { "name": "isReleased", "type": "bool" },
        ],
    },
    // State Variables
    {
        "inputs": [],
        "name": "loanCounter",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256" }],
    },
    {
        "inputs": [],
        "name": "collateralCounter",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256" }],
    },
    {
        "inputs": [],
        "name": "reserveFundBalance",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256" }],
    },
    // Write Functions
    {
        "inputs": [
            { "name": "_loanAmount", "type": "uint256" },
            { "name": "_interestRate", "type": "uint256" },
            { "name": "_durationMonths", "type": "uint256" },
            { "name": "_collateralId", "type": "uint256" },
        ],
        "name": "createLoan",
        "type": "function",
        "constant": false,
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
    },
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "fundLoan",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": true,
    },
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "repayLoan",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": true,
    },
    {
        "inputs": [
            { "name": "_collateralType", "type": "string" },
            { "name": "_estimatedValue", "type": "uint256" },
            { "name": "_documentHash", "type": "string" },
        ],
        "name": "depositCollateral",
        "type": "function",
        "constant": false,
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
    },
    {
        "inputs": [{ "name": "_collateralId", "type": "uint256" }],
        "name": "verifyCollateral",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [
            { "name": "_collateralId", "type": "uint256" },
            { "name": "_newValue", "type": "uint256" },
        ],
        "name": "updateCollateralValue",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "triggerDefault",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [],
        "name": "depositToReserveFund",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": true,
    },
    // Loan Topup Functions
    {
        "inputs": [
            { "name": "_loanId", "type": "uint256" },
            { "name": "_additionalAmount", "type": "uint256" },
            { "name": "_additionalMonths", "type": "uint256" },
        ],
        "name": "requestLoanTopup",
        "type": "function",
        "constant": false,
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
    },
    {
        "inputs": [{ "name": "_topupId", "type": "uint256" }],
        "name": "approveLoanTopup",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [{ "name": "_topupId", "type": "uint256" }],
        "name": "fundLoanTopup",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": true,
    },
    {
        "inputs": [{ "name": "_topupId", "type": "uint256" }],
        "name": "getLoanTopup",
        "type": "function",
        "constant": true,
        "outputs": [
            {
                "components": [
                    { "name": "id", "type": "uint256" },
                    { "name": "loanId", "type": "uint256" },
                    { "name": "borrower", "type": "address" },
                    { "name": "additionalAmount", "type": "uint256" },
                    { "name": "newTotalAmount", "type": "uint256" },
                    { "name": "interestRate", "type": "uint256" },
                    { "name": "additionalMonths", "type": "uint256" },
                    { "name": "isApproved", "type": "bool" },
                    { "name": "isFunded", "type": "bool" },
                    { "name": "requestedAt", "type": "uint256" },
                    { "name": "approvedAt", "type": "uint256" },
                ],
                "name": "",
                "type": "tuple",
            },
        ],
    },
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "getLoanTopups",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256[]" }],
    },
    {
        "inputs": [],
        "name": "topupCounter",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256" }],
    },
    // View Functions
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "getLoan",
        "type": "function",
        "constant": true,
        "outputs": [
            {
                "components": [
                    { "name": "id", "type": "uint256" },
                    { "name": "borrower", "type": "address" },
                    { "name": "lenders", "type": "address[]" },
                    { "name": "loanAmount", "type": "uint256" },
                    { "name": "interestRate", "type": "uint256" },
                    { "name": "durationMonths", "type": "uint256" },
                    { "name": "fundedAmount", "type": "uint256" },
                    { "name": "repaidAmount", "type": "uint256" },
                    { "name": "status", "type": "uint8" },
                    { "name": "collateralId", "type": "uint256" },
                    { "name": "createdAt", "type": "uint256" },
                    { "name": "fundedAt", "type": "uint256" },
                    { "name": "fullyFundedAt", "type": "uint256" },
                    { "name": "dueDate", "type": "uint256" },
                    { "name": "defaultDate", "type": "uint256" },
                ],
                "name": "",
                "type": "tuple",
            },
        ],
    },
    {
        "inputs": [{ "name": "_collateralId", "type": "uint256" }],
        "name": "getCollateral",
        "type": "function",
        "constant": true,
        "outputs": [
            {
                "components": [
                    { "name": "id", "type": "uint256" },
                    { "name": "owner", "type": "address" },
                    { "name": "loanId", "type": "uint256" },
                    { "name": "collateralType", "type": "string" },
                    { "name": "estimatedValue", "type": "uint256" },
                    { "name": "documentHash", "type": "string" },
                    { "name": "isVerified", "type": "bool" },
                    { "name": "isLocked", "type": "bool" },
                    { "name": "isReleased", "type": "bool" },
                ],
                "name": "",
                "type": "tuple",
            },
        ],
    },
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "getLoanRepayments",
        "type": "function",
        "constant": true,
        "outputs": [
            {
                "components": [
                    { "name": "loanId", "type": "uint256" },
                    { "name": "amount", "type": "uint256" },
                    { "name": "principal", "type": "uint256" },
                    { "name": "interest", "type": "uint256" },
                    { "name": "dueDate", "type": "uint256" },
                    { "name": "paidAt", "type": "uint256" },
                    { "name": "status", "type": "uint8" },
                ],
                "name": "",
                "type": "tuple[]",
            },
        ],
    },
    {
        "inputs": [{ "name": "_lender", "type": "address" }],
        "name": "getLenderInvestments",
        "type": "function",
        "constant": true,
        "outputs": [
            {
                "components": [
                    { "name": "loanId", "type": "uint256" },
                    { "name": "amount", "type": "uint256" },
                    { "name": "earnedAmount", "type": "uint256" },
                    { "name": "isActive", "type": "bool" },
                ],
                "name": "",
                "type": "tuple[]",
            },
        ],
    },
    {
        "inputs": [{ "name": "_borrower", "type": "address" }],
        "name": "getBorrowerLoans",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256[]" }],
    },
    {
        "inputs": [
            { "name": "_loanAmount", "type": "uint256" },
            { "name": "_collateralValue", "type": "uint256" },
        ],
        "name": "calculateLTV",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256" }],
    },
    // Events
    "event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 interestRate)",
    "event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 amount)",
    "event LoanFullyFunded(uint256 indexed loanId)",
    "event LoanActivated(uint256 indexed loanId, uint256 dueDate)",
    "event RepaymentMade(uint256 indexed loanId, uint256 amount)",
    "event LoanRepaid(uint256 indexed loanId)",
    "event DefaultTriggered(uint256 indexed loanId)",
    "event CollateralDeposited(uint256 indexed collateralId, uint256 loanId, uint256 value)",
    "event CollateralReleased(uint256 indexed collateralId)",
    "event CollateralTransferredToMarketplace(uint256 indexed collateralId)",
    "event ClaimPaid(uint256 indexed loanId, uint256 amount)",
    "event LoanTopupRequested(uint256 indexed topupId, uint256 indexed loanId, uint256 amount)",
    "event LoanTopupApproved(uint256 indexed topupId, uint256 indexed loanId)",
    "event LoanTopupFunded(uint256 indexed topupId, uint256 indexed loanId, uint256 amount)",
];

// LendaEscrow Contract ABI (key functions)
export const LENDA_ESCROW_ABI = [
    // Enums
    {
        "inputs": [],
        "name": "EscrowStatus",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint8" }],
    },
    // Structs
    {
        "inputs": [{ "name": "_transactionId", "type": "uint256" }],
        "name": "transactions",
        "type": "function",
        "constant": true,
        "outputs": [
            { "name": "id", "type": "uint256" },
            { "name": "buyer", "type": "address" },
            { "name": "seller", "type": "address" },
            { "name": "amount", "type": "uint256" },
            { "name": "shippingFee", "type": "uint256" },
            { "name": "platformFee", "type": "uint256" },
            { "name": "status", "type": "uint8" },
            { "name": "description", "type": "string" },
            { "name": "trackingNumber", "type": "string" },
            { "name": "shippingCarrier", "type": "string" },
            { "name": "createdAt", "type": "uint256" },
            { "name": "fundedAt", "type": "uint256" },
            { "name": "shippedAt", "type": "uint256" },
            { "name": "deliveredAt", "type": "uint256" },
            { "name": "releasedAt", "type": "uint256" },
            { "name": "disputeReason", "type": "string" },
            { "name": "deliveryProof", "type": "string" },
        ],
    },
    // State Variables
    {
        "inputs": [],
        "name": "transactionCounter",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256" }],
    },
    {
        "inputs": [],
        "name": "platformFeePercent",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256" }],
    },
    {
        "inputs": [],
        "name": "maxTransactionAmount",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256" }],
    },
    // Write Functions
    {
        "inputs": [
            { "name": "_seller", "type": "address" },
            { "name": "_amount", "type": "uint256" },
            { "name": "_shippingFee", "type": "uint256" },
            { "name": "_description", "type": "string" },
        ],
        "name": "createTransaction",
        "type": "function",
        "constant": false,
        "outputs": [{ "name": "", "type": "uint256" }],
        "payable": false,
    },
    {
        "inputs": [{ "name": "_transactionId", "type": "uint256" }],
        "name": "fundTransaction",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": true,
    },
    {
        "inputs": [
            { "name": "_transactionId", "type": "uint256" },
            { "name": "_trackingNumber", "type": "string" },
            { "name": "_carrier", "type": "string" },
        ],
        "name": "markAsShipped",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [{ "name": "_transactionId", "type": "uint256" }],
        "name": "confirmDelivery",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [{ "name": "_transactionId", "type": "uint256" }],
        "name": "releaseFunds",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [
            { "name": "_transactionId", "type": "uint256" },
            { "name": "_reason", "type": "string" },
        ],
        "name": "openDispute",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [
            { "name": "_transactionId", "type": "uint256" },
            { "name": "_resolution", "type": "string" },
            { "name": "_refundBuyer", "type": "bool" },
        ],
        "name": "resolveDispute",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [{ "name": "_transactionId", "type": "uint256" }],
        "name": "cancelTransaction",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [{ "name": "_transactionId", "type": "uint256" }],
        "name": "emergencyCancel",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    // View Functions
    {
        "inputs": [{ "name": "_transactionId", "type": "uint256" }],
        "name": "getTransaction",
        "type": "function",
        "constant": true,
        "outputs": [
            {
                "components": [
                    { "name": "id", "type": "uint256" },
                    { "name": "buyer", "type": "address" },
                    { "name": "seller", "type": "address" },
                    { "name": "amount", "type": "uint256" },
                    { "name": "shippingFee", "type": "uint256" },
                    { "name": "platformFee", "type": "uint256" },
                    { "name": "status", "type": "uint8" },
                    { "name": "description", "type": "string" },
                    { "name": "trackingNumber", "type": "string" },
                    { "name": "shippingCarrier", "type": "string" },
                    { "name": "createdAt", "type": "uint256" },
                    { "name": "fundedAt", "type": "uint256" },
                    { "name": "shippedAt", "type": "uint256" },
                    { "name": "deliveredAt", "type": "uint256" },
                    { "name": "releasedAt", "type": "uint256" },
                    { "name": "disputeReason", "type": "string" },
                    { "name": "deliveryProof", "type": "string" },
                ],
                "name": "",
                "type": "tuple",
            },
        ],
    },
    {
        "inputs": [{ "name": "_buyer", "type": "address" }],
        "name": "getBuyerTransactions",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256[]" }],
    },
    {
        "inputs": [{ "name": "_seller", "type": "address" }],
        "name": "getSellerTransactions",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256[]" }],
    },
    {
        "inputs": [],
        "name": "getTransactionCount",
        "type": "function",
        "constant": true,
        "outputs": [{ "name": "", "type": "uint256" }],
    },
    // Admin Functions
    {
        "inputs": [{ "name": "_newFee", "type": "uint256" }],
        "name": "setPlatformFeePercent",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [{ "name": "_newMax", "type": "uint256" }],
        "name": "setMaxTransactionAmount",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    {
        "inputs": [],
        "name": "withdrawPlatformFees",
        "type": "function",
        "constant": false,
        "outputs": [],
        "payable": false,
    },
    // Events
    "event TransactionCreated(uint256 indexed id, address indexed buyer, address indexed seller, uint256 amount)",
    "event TransactionFunded(uint256 indexed id, uint256 amount)",
    "event TransactionShipped(uint256 indexed id, string trackingNumber)",
    "event TransactionDelivered(uint256 indexed id)",
    "event FundsReleased(uint256 indexed id, uint256 amount)",
    "event DisputeOpened(uint256 indexed id, string reason)",
    "event DisputeResolved(uint256 indexed id, string resolution)",
    "event TransactionRefunded(uint256 indexed id)",
    "event TransactionCancelled(uint256 indexed id)",
];

// Contract addresses by network
export const CONTRACT_ADDRESSES = {
    // Mainnet
    1: {
        LendaLoan: '0x0000000000000000000000000000000000000000',
        LendaEscrow: '0x0000000000000000000000000000000000000000',
    },
    // Sepolia Testnet
    11155111: {
        LendaLoan: '0x0000000000000000000000000000000000000000',
        LendaEscrow: '0x0000000000000000000000000000000000000000',
    },
    // Local development / Ganache
    1337: {
        LendaLoan: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        LendaEscrow: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    },
    // Hardhat localhost
    31337: {
        LendaLoan: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        LendaEscrow: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    },
};

// Loan Status Enum mapping
export const LOAN_STATUS = {
    0: 'REQUESTED',
    1: 'FUNDED',
    2: 'ACTIVE',
    3: 'REPAID',
    4: 'DEFAULTED',
    5: 'PLATFORM_SETTLED',
    6: 'CANCELLED',
};

// Repayment Status Enum mapping
export const REPAYMENT_STATUS = {
    0: 'PENDING',
    1: 'PAID',
    2: 'LATE',
    3: 'DEFAULTED',
};

// Escrow Status Enum mapping
export const ESCROW_STATUS = {
    0: 'CREATED',
    1: 'FUNDED',
    2: 'SHIPPED',
    3: 'DELIVERED',
    4: 'DISPUTED',
    5: 'RELEASED',
    6: 'REFUNDED',
    7: 'CANCELLED',
};
