/**
 * Repayment Scheduler Service
 * BF-06: Automatic repayment scheduling with cron job implementation
 * 
 * This service handles automatic payment scheduling and processing
 */

import { createApiClient } from '../utils/api/client';

const API_URL = '/api/repayments';
const api = createApiClient(API_URL);

// Payment schedule frequencies
export const SCHEDULE_FREQUENCY = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    BIWEEKLY: 'biweekly',
    MONTHLY: 'monthly',
};

// Payment status
export const PAYMENT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
};

const repaymentSchedulerService = {
    /**
     * Get all scheduled payments for current user
     */
    getScheduledPayments: async (loanId = null) => {
        const params = loanId ? { loanId } : {};
        const response = await api.get('/scheduled', { params });
        return response.data;
    },

    /**
     * Schedule a new automatic payment
     */
    schedulePayment: async (scheduleData) => {
        const response = await api.post('/schedule', scheduleData);
        return response.data;
    },

    /**
     * Update an existing payment schedule
     */
    updateSchedule: async (scheduleId, updateData) => {
        const response = await api.put(`/schedule/${scheduleId}`, updateData);
        return response.data;
    },

    /**
     * Cancel a scheduled payment
     */
    cancelSchedule: async (scheduleId) => {
        const response = await api.delete(`/schedule/${scheduleId}`);
        return response.data;
    },

    /**
     * Pause all automatic payments for a loan
     */
    pauseAutoPayments: async (loanId) => {
        const response = await api.post(`/loan/${loanId}/pause-auto`);
        return response.data;
    },

    /**
     * Resume automatic payments for a loan
     */
    resumeAutoPayments: async (loanId) => {
        const response = await api.post(`/loan/${loanId}/resume-auto`);
        return response.data;
    },

    /**
     * Get next payment date based on frequency
     */
    getNextPaymentDate: (frequency, startDate = new Date()) => {
        const date = new Date(startDate);
        
        switch (frequency) {
            case SCHEDULE_FREQUENCY.DAILY:
                date.setDate(date.getDate() + 1);
                break;
            case SCHEDULE_FREQUENCY.WEEKLY:
                date.setDate(date.getDate() + 7);
                break;
            case SCHEDULE_FREQUENCY.BIWEEKLY:
                date.setDate(date.getDate() + 14);
                break;
            case SCHEDULE_FREQUENCY.MONTHLY:
                date.setMonth(date.getMonth() + 1);
                break;
            default:
                date.setMonth(date.getMonth() + 1);
        }
        
        return date.toISOString();
    },

    /**
     * Calculate payment amount with interest
     */
    calculatePaymentAmount: (principal, interestRate, frequency) => {
        const rate = interestRate / 100;
        let periodsPerYear;
        
        switch (frequency) {
            case SCHEDULE_FREQUENCY.DAILY:
                periodsPerYear = 365;
                break;
            case SCHEDULE_FREQUENCY.WEEKLY:
                periodsPerYear = 52;
                break;
            case SCHEDULE_FREQUENCY.BIWEEKLY:
                periodsPerYear = 26;
                break;
            case SCHEDULE_FREQUENCY.MONTHLY:
            default:
                periodsPerYear = 12;
        }
        
        // Simple interest calculation
        const periodicRate = rate / periodsPerYear;
        return principal * (1 + periodicRate);
    },

    /**
     * Process scheduled payments (called by cron job on backend)
     * This is for the backend to call - not used directly by frontend
     */
    processScheduledPayments: async () => {
        const response = await api.post('/process-scheduled');
        return response.data;
    },

    /**
     * Get payment history
     */
    getPaymentHistory: async (loanId, page = 1, limit = 10) => {
        const response = await api.get('/history', {
            params: { loanId, page, limit }
        });
        return response.data;
    },

    /**
     * Set up automatic wallet debit for payments
     */
    setupAutoDebit: async (loanId, bankAccountId, schedule) => {
        const response = await api.post('/auto-debit/setup', {
            loanId,
            bankAccountId,
            schedule,
            enabled: true
        });
        return response.data;
    },

    /**
     * Get auto-debit status for a loan
     */
    getAutoDebitStatus: async (loanId) => {
        const response = await api.get(`/loan/${loanId}/auto-debit`);
        return response.data;
    },

    /**
     * Update auto-debit settings
     */
    updateAutoDebit: async (loanId, settings) => {
        const response = await api.put(`/loan/${loanId}/auto-debit`, settings);
        return response.data;
    },

    /**
     * Get upcoming payments for next N days
     */
    getUpcomingPayments: async (days = 7) => {
        const response = await api.get('/upcoming', { params: { days } });
        return response.data;
    },

    /**
     * Manually trigger a payment (for testing or immediate payment)
     */
    triggerPayment: async (scheduleId) => {
        const response = await api.post(`/schedule/${scheduleId}/trigger`);
        return response.data;
    },
};

export default repaymentSchedulerService;
