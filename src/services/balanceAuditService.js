/**
 * Balance Audit Service
 * 
 * Implements double-entry bookkeeping verification and audit trail for balance changes
 * 
 * FIN-15: Double-entry bookkeeping verification
 * FIN-17: Audit trail for balance changes
 * 
 * In double-entry bookkeeping:
 * - Every transaction has a debit and credit entry
 * - Total debits must equal total credits
 * - Assets = Liabilities + Equity
 */

import apiClient from '../utils/api/client';

/**
 * Transaction types for double-entry bookkeeping
 */
export const TransactionType = {
  LOAN_FUNDED: 'LOAN_FUNDED',
  LOAN_REPAID: 'LOAN_REPAID',
  INTEREST_PAYMENT: 'INTEREST_PAYMENT',
  PLATFORM_FEE: 'PLATFORM_FEE',
  RESERVE_DEPOSIT: 'RESERVE_DEPOSIT',
  RESERVE_WITHDRAWAL: 'RESERVE_WITHDRAWAL',
  COLLATERAL_DEPOSIT: 'COLLATERAL_DEPOSIT',
  COLLATERAL_RELEASE: 'COLLATERAL_RELEASE',
  DEFAULT_PAYOUT: 'DEFAULT_PAYOUT',
  AUCTION_PROCEEDS: 'AUCTION_PROCEEDS',
  TOKEN_MINT: 'TOKEN_MINT',
  TOKEN_TRANSFER: 'TOKEN_TRANSFER'
};

/**
 * Account types for ledger tracking
 */
export const AccountType = {
  // Asset accounts
  LENDER_WALLET: 'LENDER_WALLET',
  BORROWER_WALLET: 'BORROWER_WALLET',
  ESCROW_ACCOUNT: 'ESCROW_ACCOUNT',
  RESERVE_FUND: 'RESERVE_FUND',
  PLATFORM_OPERATIONS: 'PLATFORM_OPERATIONS',
  
  // Liability accounts
  PENDING_SETTLEMENTS: 'PENDING_SETTLEMENTS',
  
  // Income/Expense
  INTEREST_INCOME: 'INTEREST_INCOME',
  PLATFORM_FEE_INCOME: 'PLATFORM_FEE_INCOME',
  BAD_DEBT_EXPENSE: 'BAD_DEBT_EXPENSE'
};

class BalanceAuditService {
  constructor() {
    this.pendingTransactions = [];
    this.auditLog = [];
  }

  /**
   * Initialize audit service
   */
  async initialize() {
    try {
      // Fetch any pending balance reconciliations from server
      const response = await apiClient.get('/api/audit/pending-reconciliations');
      if (response.data.success) {
        this.pendingTransactions = response.data.reconciliations || [];
      }
    } catch (error) {
      console.warn('Could not fetch pending reconciliations:', error);
    }
  }

  /**
   * Record a double-entry transaction
   * Each transaction must have balanced debits and credits
   * 
   * @param {string} transactionId - Unique transaction identifier
   * @param {Object} entries - Array of { account, type, amount, direction }
   * @param {string} description - Transaction description
   */
  async recordTransaction(transactionId, entries, description) {
    // Validate double-entry: total debits must equal total credits
    const { valid, debitTotal, creditTotal } = this.validateDoubleEntry(entries);
    
    if (!valid) {
      throw new Error(
        `Double-entry validation failed: Debits (${debitTotal}) != Credits (${creditTotal})`
      );
    }

    const transaction = {
      id: transactionId,
      entries: entries,
      description: description,
      timestamp: new Date().toISOString(),
      totalAmount: debitTotal,
      status: 'PENDING'
    };

    // Store locally for audit
    this.auditLog.push(transaction);

    // Send to server for permanent storage
    try {
      await apiClient.post('/api/audit/transactions', {
        transactionId,
        entries,
        description,
        totalAmount: debitTotal,
        validated: true
      });
    } catch (error) {
      console.error('Failed to persist audit transaction:', error);
    }

    return transaction;
  }

  /**
   * Validate double-entry bookkeeping
   * @param {Array} entries - Array of { account, type, amount, direction }
   * @returns {Object} { valid, debitTotal, creditTotal }
   */
  validateDoubleEntry(entries) {
    let debitTotal = 0;
    let creditTotal = 0;

    for (const entry of entries) {
      const amount = this.normalizeAmount(entry.amount);
      
      if (entry.direction === 'DEBIT') {
        debitTotal += amount;
      } else if (entry.direction === 'CREDIT') {
        creditTotal += amount;
      }
    }

    // Allow for small rounding differences (less than 0.01)
    const isValid = Math.abs(debitTotal - creditTotal) < 0.01;

    return {
      valid: isValid,
      debitTotal,
      creditTotal,
      difference: debitTotal - creditTotal
    };
  }

  /**
   * Normalize amount to wei/smallest unit
   */
  normalizeAmount(amount) {
    if (typeof amount === 'string') {
      return parseFloat(amount);
    }
    return Number(amount);
  }

  /**
   * Record loan funding transaction
   * Debit: Lender Wallet
   * Credit: Borrower Wallet (loan proceeds)
   */
  async recordLoanFunding(loanId, lenderAddress, borrowerAddress, amount) {
    const transactionId = `LOAN_FUND_${loanId}_${Date.now()}`;
    
    return this.recordTransaction(transactionId, [
      { account: AccountType.LENDER_WALLET, address: lenderAddress, type: TransactionType.LOAN_FUNDED, amount, direction: 'DEBIT' },
      { account: AccountType.BORROWER_WALLET, address: borrowerAddress, type: TransactionType.LOAN_FUNDED, amount, direction: 'CREDIT' }
    ], `Loan funding for loan ${loanId}`);
  }

  /**
   * Record loan repayment
   * Debit: Borrower Wallet
   * Credit: Lender Wallet (principal + interest)
   * Credit: Platform Fee Income
   */
  async recordLoanRepayment(loanId, borrowerAddress, lenderAddress, principalAmount, interestAmount, feeAmount) {
    const transactionId = `LOAN_REPAY_${loanId}_${Date.now()}`;
    const totalAmount = principalAmount + interestAmount;
    
    const entries = [
      { account: AccountType.BORROWER_WALLET, address: borrowerAddress, type: TransactionType.LOAN_REPAID, amount: totalAmount, direction: 'DEBIT' },
      { account: AccountType.LENDER_WALLET, address: lenderAddress, type: TransactionType.LOAN_REPAID, amount: principalAmount, direction: 'CREDIT' },
      { account: AccountType.LENDER_WALLET, address: lenderAddress, type: TransactionType.INTEREST_PAYMENT, amount: interestAmount, direction: 'CREDIT' }
    ];

    if (feeAmount > 0) {
      entries.push({
        account: AccountType.PLATFORM_OPERATIONS,
        address: 'PLATFORM',
        type: TransactionType.PLATFORM_FEE,
        amount: feeAmount,
        direction: 'CREDIT'
      });
    }

    return this.recordTransaction(transactionId, entries, `Loan repayment for loan ${loanId}`);
  }

  /**
   * Record reserve fund deposit
   * Debit: Platform Operations
   * Credit: Reserve Fund
   */
  async recordReserveDeposit(fromAddress, amount) {
    const transactionId = `RESERVE_DEPOSIT_${Date.now()}`;
    
    return this.recordTransaction(transactionId, [
      { account: AccountType.PLATFORM_OPERATIONS, address: fromAddress, type: TransactionType.RESERVE_DEPOSIT, amount, direction: 'DEBIT' },
      { account: AccountType.RESERVE_FUND, address: 'RESERVE_CONTRACT', type: TransactionType.RESERVE_DEPOSIT, amount, direction: 'CREDIT' }
    ], `Reserve fund deposit from ${fromAddress}`);
  }

  /**
   * Record reserve fund payout (on default)
   * Debit: Reserve Fund
   * Credit: Lender Wallet
   */
  async recordReservePayout(loanId, lenderAddress, amount) {
    const transactionId = `RESERVE_PAYOUT_${loanId}_${Date.now()}`;
    
    return this.recordTransaction(transactionId, [
      { account: AccountType.RESERVE_FUND, address: 'RESERVE_CONTRACT', type: TransactionType.DEFAULT_PAYOUT, amount, direction: 'DEBIT' },
      { account: AccountType.LENDER_WALLET, address: lenderAddress, type: TransactionType.DEFAULT_PAYOUT, amount, direction: 'CREDIT' }
    ], `Reserve payout for defaulted loan ${loanId}`);
  }

  /**
   * Record platform fee collection
   * Debit: Various source accounts
   * Credit: Platform Fee Income
   */
  async recordPlatformFee(sourceAccount, amount) {
    const transactionId = `PLATFORM_FEE_${Date.now()}`;
    
    return this.recordTransaction(transactionId, [
      { account: sourceAccount, address: 'SOURCE', type: TransactionType.PLATFORM_FEE, amount, direction: 'DEBIT' },
      { account: AccountType.PLATFORM_FEE_INCOME, address: 'PLATFORM', type: TransactionType.PLATFORM_FEE, amount, direction: 'CREDIT' }
    ], `Platform fee collection`);
  }

  /**
   * Verify ledger balance reconciliation
   * Checks that total assets = total liabilities + equity
   * 
   * @returns {Object} Reconciliation result
   */
  async verifyLedgerBalances() {
    try {
      const response = await apiClient.get('/api/audit/ledger-reconciliation');
      return response.data;
    } catch (error) {
      // Fallback to local verification
      return this.localLedgerVerification();
    }
  }

  /**
   * Local ledger verification
   */
  localLedgerVerification() {
    const accountBalances = {};
    
    // Calculate balances from all transactions
    for (const transaction of this.auditLog) {
      for (const entry of transaction.entries) {
        if (!accountBalances[entry.account]) {
          accountBalances[entry.account] = 0;
        }
        
        if (entry.direction === 'DEBIT') {
          accountBalances[entry.account] += entry.amount;
        } else {
          accountBalances[entry.account] -= entry.amount;
        }
      }
    }

    // Calculate totals by account type
    const assets = [
      AccountType.LENDER_WALLET,
      AccountType.BORROWER_WALLET,
      AccountType.ESCROW_ACCOUNT,
      AccountType.RESERVE_FUND
    ];
    
    const liabilities = [AccountType.PENDING_SETTLEMENTS];
    
    const equity = [
      AccountType.PLATFORM_OPERATIONS,
      AccountType.INTEREST_INCOME,
      AccountType.PLATFORM_FEE_INCOME,
      AccountType.BAD_DEBT_EXPENSE
    ];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const [account, balance] of Object.entries(accountBalances)) {
      if (assets.includes(account)) {
        totalAssets += balance;
      } else if (liabilities.includes(account)) {
        totalLiabilities += Math.abs(balance);
      } else if (equity.includes(account)) {
        totalEquity += balance;
      }
    }

    const accountingEquation = totalAssets === (totalLiabilities + totalEquity);
    
    return {
      valid: accountingEquation,
      totalAssets,
      totalLiabilities,
      totalEquity,
      equation: `${totalAssets} = ${totalLiabilities} + ${totalEquity}`,
      accountBalances,
      transactionCount: this.auditLog.length
    };
  }

  /**
   * Get audit trail for an address
   * @param {string} address - Wallet or contract address
   * @returns {Array} Transaction history
   */
  async getAuditTrail(address) {
    try {
      const response = await apiClient.get(`/api/audit/trail/${address}`);
      return response.data.transactions || [];
    } catch (error) {
      // Fallback to local filtering
      return this.auditLog.filter(t => 
        t.entries.some(e => e.address === address)
      );
    }
  }

  /**
   * Get balance change history for reconciliation
   * @param {string} accountType - Type of account
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   */
  async getBalanceChanges(accountType, startTime, endTime) {
    const changes = [];
    
    for (const transaction of this.auditLog) {
      const txTime = new Date(transaction.timestamp).getTime();
      
      if (txTime >= startTime && txTime <= endTime) {
        for (const entry of transaction.entries) {
          if (entry.account === accountType) {
            changes.push({
              transactionId: transaction.id,
              description: transaction.description,
              timestamp: transaction.timestamp,
              amount: entry.amount,
              direction: entry.direction
            });
          }
        }
      }
    }
    
    return changes;
  }

  /**
   * Generate audit report for a specific period
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   */
  async generateAuditReport(startDate, endDate) {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    // Get all transactions in period
    const periodTransactions = this.auditLog.filter(t => {
      const txTime = new Date(t.timestamp).getTime();
      return txTime >= startTime && txTime <= endTime;
    });

    // Calculate totals
    let totalDebits = 0;
    let totalCredits = 0;
    const transactionTypes = {};

    for (const tx of periodTransactions) {
      for (const entry of tx.entries) {
        if (entry.direction === 'DEBIT') {
          totalDebits += entry.amount;
        } else {
          totalCredits += entry.amount;
        }
        
        if (!transactionTypes[entry.type]) {
          transactionTypes[entry.type] = { count: 0, total: 0 };
        }
        transactionTypes[entry.type].count++;
        transactionTypes[entry.type].total += entry.amount;
      }
    }

    // Verify double-entry
    const verification = this.localLedgerVerification();

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalTransactions: periodTransactions.length,
        totalDebits,
        totalCredits,
        difference: totalDebits - totalCredits,
        doubleEntryValid: Math.abs(totalDebits - totalCredits) < 0.01
      },
      transactionTypes,
      reconciliation: verification,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Export audit data for external review
   */
  async exportAuditData(format = 'json') {
    const data = {
      auditLog: this.auditLog,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    if (format === 'csv') {
      // Convert to CSV format
      let csv = 'TransactionID,Account,Address,Type,Amount,Direction,Description,Timestamp\n';
      
      for (const tx of this.auditLog) {
        for (const entry of tx.entries) {
          csv += `${tx.id},${entry.account},${entry.address},${entry.type},${entry.amount},${entry.direction},${entry.description || ''},${tx.timestamp}\n`;
        }
      }
      
      return csv;
    }

    return data;
  }
}

// Export singleton instance
const balanceAuditService = new BalanceAuditService();
export default balanceAuditService;
