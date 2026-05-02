import { z } from 'zod';

/**
 * Ethereum address validation
 */
const ethereumAddress = z
    .string()
    .min(1, 'Address is required')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum address');

/**
 * Positive number validation
 */
const positiveNumber = (min = 0, message = 'Amount must be greater than 0') =>
    z.coerce.number().min(min, message);

/**
 * Create Escrow validation schema
 */
export const createEscrowSchema = z.object({
    transactionType: z.enum(['purchase', 'custom'], {
        errorMap: () => ({ message: 'Please select a valid transaction type' }),
    }),
    amount: positiveNumber(1, 'Minimum amount is $1')
        .max(1000000, 'Maximum amount is $1,000,000'),
    shippingFee: positiveNumber(0, 'Shipping fee cannot be negative')
        .max(10000, 'Maximum shipping fee is $10,000')
        .optional()
        .default(0),
    sellerAddress: ethereumAddress,
    description: z
        .string()
        .min(10, 'Please provide a description (at least 10 characters)')
        .max(1000, 'Description must be less than 1000 characters'),
    expectedDeliveryDays: z.coerce.number()
        .min(1, 'Delivery days must be at least 1')
        .max(90, 'Delivery days cannot exceed 90'),
});

/**
 * Fund Loan validation schema
 */
export const fundLoanSchema = z.object({
    loanId: z.string().min(1, 'Loan ID is required'),
    amount: positiveNumber(0.01, 'Minimum amount is $0.01'),
});

/**
 * Create Loan Request validation schema
 */
export const createLoanRequestSchema = z.object({
    loanAmount: positiveNumber(100, 'Minimum loan amount is $100')
        .max(1000000, 'Maximum loan amount is $1,000,000'),
    interestRate: z.coerce.number()
        .min(1, 'Interest rate must be at least 1%')
        .max(50, 'Interest rate cannot exceed 50%'),
    durationMonths: z.coerce.number()
        .min(1, 'Duration must be at least 1 month')
        .max(60, 'Duration cannot exceed 60 months'),
    collateralType: z.string().min(1, 'Please select a collateral type'),
    collateralValue: positiveNumber(1, 'Collateral value must be at least $1'),
    description: z
        .string()
        .min(20, 'Please provide a detailed description (at least 20 characters)')
        .max(2000, 'Description must be less than 2000 characters'),
    collateralAddress: ethereumAddress.optional(),
});

/**
 * Repayment validation schema
 */
export const repaymentSchema = z.object({
    loanId: z.string().min(1, 'Loan ID is required'),
    amount: positiveNumber(0.01, 'Repayment amount must be at least $0.01'),
    paymentMethod: z.enum(['wallet', 'bank_transfer', 'crypto'], {
        errorMap: () => ({ message: 'Please select a valid payment method' }),
    }),
});

/**
 * Wallet transfer validation schema
 */
export const walletTransferSchema = z.object({
    recipientAddress: ethereumAddress,
    amount: positiveNumber(0.001, 'Minimum transfer amount is $0.001')
        .max(1000000, 'Maximum transfer amount is $1,000,000'),
    note: z.string().max(200, 'Note must be less than 200 characters').optional(),
});

/**
 * Collateral verification schema
 */
export const collateralVerificationSchema = z.object({
    collateralId: z.string().min(1, 'Collateral ID is required'),
    verificationStatus: z.enum(['approved', 'rejected'], {
        errorMap: () => ({ message: 'Please select a valid status' }),
    }),
    notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});
