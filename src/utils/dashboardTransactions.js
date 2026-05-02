import { formatCurrency } from './formatters';

const toNumber = (value) => {
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const toStatus = (value) => String(value || '').toUpperCase();

const toDate = (value, fallback = new Date().toISOString()) => {
    if (!value) return fallback;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

const shiftMonths = (dateValue, monthsToAdd) => {
    const date = new Date(dateValue);
    date.setMonth(date.getMonth() + monthsToAdd);
    return date.toISOString();
};

export const normalizeLoan = (loan) => {
    const loanAmount = toNumber(loan?.loanAmount ?? loan?.amount ?? loan?.principal ?? 0);
    const interestRate = toNumber(loan?.interestRate ?? loan?.rate ?? 0);
    const durationMonths = Math.max(
        1,
        Math.round(toNumber(loan?.durationMonths ?? loan?.duration ?? 1) / (toNumber(loan?.durationMonths) ? 1 : 30))
    );
    const repaidAmount = toNumber(loan?.repaidAmount ?? loan?.amountRepaid ?? 0);
    const fundedAmount = toNumber(loan?.fundedAmount ?? loan?.investedAmount ?? loanAmount);
    const createdAt = toDate(loan?.createdAt ?? loan?.fundedAt ?? loan?.approvedAt);

    return {
        ...loan,
        id: loan?.id,
        title: loan?.title || loan?.name || `Loan ${loan?.id}`,
        status: toStatus(loan?.status),
        loanAmount,
        interestRate,
        durationMonths,
        repaidAmount,
        fundedAmount,
        earnedAmount: toNumber(loan?.earnedAmount ?? loan?.interestEarned ?? 0),
        createdAt,
        repaymentSchedule: Array.isArray(loan?.repaymentSchedule) ? loan.repaymentSchedule : null,
        borrowerId: loan?.borrowerId,
        borrower: loan?.borrower,
    };
};

export const normalizeWalletTransaction = (transaction) => ({
    ...transaction,
    id: transaction?.id,
    type: toStatus(transaction?.type),
    status: toStatus(transaction?.status),
    amount: toNumber(transaction?.amount),
    timestamp: toDate(transaction?.timestamp ?? transaction?.createdAt),
    description: transaction?.description || '',
});

export const buildRepaymentSchedule = (loan) => {
    if (Array.isArray(loan.repaymentSchedule) && loan.repaymentSchedule.length > 0) {
        let paidRemaining = loan.repaidAmount;

        return loan.repaymentSchedule.map((payment, index) => {
            const amount = toNumber(payment?.amount ?? payment?.installmentAmount);
            const dueDate = toDate(payment?.dueDate ?? shiftMonths(loan.createdAt, index + 1));
            const paid = paidRemaining >= amount;
            paidRemaining = paid ? paidRemaining - amount : paidRemaining;

            return {
                installment: payment?.installment ?? index + 1,
                amount,
                dueDate,
                status: paid ? 'COMPLETED' : 'PENDING',
            };
        });
    }

    const monthlyPrincipal = loan.loanAmount / loan.durationMonths;
    const monthlyInterest = (loan.loanAmount * loan.interestRate) / 100 / 12;
    const installmentAmount = monthlyPrincipal + monthlyInterest;
    let paidRemaining = loan.repaidAmount;

    return Array.from({ length: loan.durationMonths }, (_, index) => {
        const dueDate = shiftMonths(loan.createdAt, index + 1);
        const paid = paidRemaining >= installmentAmount;
        paidRemaining = paid ? paidRemaining - installmentAmount : paidRemaining;

        return {
            installment: index + 1,
            amount: installmentAmount,
            dueDate,
            status: paid ? 'COMPLETED' : 'PENDING',
        };
    });
};

const mapMilestoneStatus = (status, dueDate) => {
    if (status === 'COMPLETED') return 'completed';
    return new Date(dueDate).getTime() < Date.now() ? 'overdue' : 'pending';
};

export const buildBorrowerRepaymentMilestones = (loans) => {
    const events = loans.flatMap((loan) => {
        const schedule = buildRepaymentSchedule(loan);
        return schedule.map((payment) => ({
            id: `${loan.id}-repayment-${payment.installment}`,
            title: `${loan.title} repayment ${payment.installment}`,
            subtitle: `Installment ${payment.installment} of ${schedule.length}`,
            description:
                payment.status === 'COMPLETED'
                    ? 'This repayment has been posted successfully.'
                    : 'This installment remains in your repayment pipeline.',
            amount: payment.amount,
            direction: 'outflow',
            date: payment.dueDate,
            status: mapMilestoneStatus(payment.status, payment.dueDate),
            badge: payment.status === 'COMPLETED' ? 'Paid' : new Date(payment.dueDate).getTime() < Date.now() ? 'Overdue' : 'Pending',
            meta: [`Loan ${loan.id}`, `Balance left ${formatCurrency(Math.max(loan.loanAmount - loan.repaidAmount, 0))}`],
        }));
    });

    return events.sort((left, right) => new Date(left.date) - new Date(right.date));
};

export const buildBorrowerTransactionTimeline = (loans, transactions) => {
    const normalizedTransactions = (transactions || []).map(normalizeWalletTransaction);

    const walletEvents = normalizedTransactions
        .filter((transaction) => ['LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'DEPOSIT', 'WITHDRAWAL'].includes(transaction.type))
        .map((transaction) => ({
            id: transaction.id,
            title: transaction.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()),
            subtitle: transaction.description || 'Wallet activity',
            description: transaction.description || 'Transaction recorded in your wallet history.',
            amount: transaction.amount,
            direction: ['LOAN_DISBURSEMENT', 'DEPOSIT'].includes(transaction.type) ? 'inflow' : 'outflow',
            date: transaction.timestamp,
            status: transaction.status === 'COMPLETED' ? 'completed' : transaction.status === 'PENDING' ? 'pending' : 'upcoming',
            badge: transaction.status,
            meta: [transaction.type],
        }));

    const derivedEvents = loans.flatMap((loan) => {
        const schedule = buildRepaymentSchedule(loan);
        const disbursement = {
            id: `${loan.id}-disbursement`,
            title: 'Loan disbursement received',
            subtitle: loan.title,
            description: 'Funds released from the approved lending facility.',
            amount: loan.loanAmount,
            direction: 'inflow',
            date: loan.createdAt,
            status: 'completed',
            badge: 'Credited',
            meta: [`Loan ${loan.id}`],
        };

        const repaymentEvents = schedule
            .filter((payment) => payment.status === 'COMPLETED' || new Date(payment.dueDate).getTime() >= Date.now())
            .map((payment) => ({
                id: `${loan.id}-timeline-${payment.installment}`,
                title: payment.status === 'COMPLETED' ? 'Repayment processed' : 'Repayment pending confirmation',
                subtitle: `${loan.title} installment ${payment.installment}`,
                description:
                    payment.status === 'COMPLETED'
                        ? 'The scheduled repayment was settled successfully.'
                        : 'This installment is queued for settlement.',
                amount: payment.amount,
                direction: 'outflow',
                date: payment.dueDate,
                status: payment.status === 'COMPLETED' ? 'completed' : 'pending',
                badge: payment.status === 'COMPLETED' ? 'Settled' : 'Awaiting settlement',
                meta: [`Loan ${loan.id}`],
            }));

        return [disbursement, ...repaymentEvents];
    });

    const merged = [...walletEvents, ...derivedEvents];
    const deduped = Array.from(new Map(merged.map((event) => [event.id, event])).values());
    return deduped.sort((left, right) => new Date(right.date) - new Date(left.date));
};

export const buildLenderMilestones = (loans) => {
    const events = loans.flatMap((loan) => {
        const schedule = buildRepaymentSchedule(loan);
        const nextPayment = schedule.find((payment) => payment.status !== 'COMPLETED');
        const completedPayments = schedule.filter((payment) => payment.status === 'COMPLETED');

        const investmentEvent = {
            id: `${loan.id}-investment`,
            title: `${loan.title} funding locked in`,
            subtitle: 'Primary investment commitment confirmed',
            description: 'Your allocation is now attached to this loan position.',
            amount: loan.fundedAmount || loan.loanAmount,
            direction: 'outflow',
            date: loan.createdAt,
            status: 'completed',
            badge: 'Invested',
            meta: [`Loan ${loan.id}`, `${loan.interestRate}% rate`],
        };

        const repaymentEvents = [];
        if (nextPayment) {
            repaymentEvents.push({
                id: `${loan.id}-expected-${nextPayment.installment}`,
                title: `${loan.title} coupon due`,
                subtitle: 'Next lender repayment expected',
                description: 'Borrower repayment is scheduled and should credit your wallet after settlement.',
                amount: nextPayment.amount,
                direction: 'inflow',
                date: nextPayment.dueDate,
                status: new Date(nextPayment.dueDate).getTime() < Date.now() ? 'overdue' : 'pending',
                badge: 'Pending inflow',
                meta: [`Loan ${loan.id}`],
            });
        }

        if (completedPayments.length > 0) {
            const latestCompleted = completedPayments[completedPayments.length - 1];
            repaymentEvents.push({
                id: `${loan.id}-received-${latestCompleted.installment}`,
                title: `${loan.title} repayment received`,
                subtitle: 'Most recent settled inflow',
                description: 'Principal and interest have already been posted to your account.',
                amount: latestCompleted.amount,
                direction: 'inflow',
                date: latestCompleted.dueDate,
                status: 'completed',
                badge: 'Received',
                meta: [`Loan ${loan.id}`],
            });
        }

        return [investmentEvent, ...repaymentEvents];
    });

    return events.sort((left, right) => new Date(left.date) - new Date(right.date));
};

export const buildLenderTransactionTimeline = (loans, transactions) => {
    const normalizedTransactions = (transactions || []).map(normalizeWalletTransaction);

    const walletEvents = normalizedTransactions
        .filter((transaction) => ['DEPOSIT', 'WITHDRAWAL', 'LENDER_INVESTMENT', 'LENDER_REPAYMENT'].includes(transaction.type))
        .map((transaction) => ({
            id: transaction.id,
            title: transaction.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()),
            subtitle: transaction.description || 'Investor wallet activity',
            description: transaction.description || 'Recorded in your lender wallet history.',
            amount: transaction.amount,
            direction: ['DEPOSIT', 'LENDER_REPAYMENT'].includes(transaction.type) ? 'inflow' : 'outflow',
            date: transaction.timestamp,
            status: transaction.status === 'COMPLETED' ? 'completed' : transaction.status === 'PENDING' ? 'pending' : 'upcoming',
            badge: transaction.status,
            meta: [transaction.type],
        }));

    const derivedEvents = loans.flatMap((loan) => {
        const schedule = buildRepaymentSchedule(loan);
        const investmentEvent = {
            id: `${loan.id}-invested`,
            title: 'Investment deployed',
            subtitle: loan.title,
            description: 'Funds were committed from your investor wallet into this loan.',
            amount: loan.fundedAmount || loan.loanAmount,
            direction: 'outflow',
            date: loan.createdAt,
            status: 'completed',
            badge: 'Deployed',
            meta: [`Loan ${loan.id}`],
        };

        const repaymentEvents = schedule
            .filter((payment) => payment.status === 'COMPLETED' || new Date(payment.dueDate).getTime() >= Date.now())
            .map((payment) => ({
                id: `${loan.id}-cashflow-${payment.installment}`,
                title: payment.status === 'COMPLETED' ? 'Repayment credited' : 'Upcoming repayment awaiting borrower settlement',
                subtitle: loan.title,
                description:
                    payment.status === 'COMPLETED'
                        ? 'The repayment was credited to your lender wallet.'
                        : 'The platform is waiting for the borrower-side settlement to clear.',
                amount: payment.amount,
                direction: 'inflow',
                date: payment.dueDate,
                status: payment.status === 'COMPLETED' ? 'completed' : 'pending',
                badge: payment.status === 'COMPLETED' ? 'Credited' : 'Awaiting borrower',
                meta: [`Loan ${loan.id}`],
            }));

        return [investmentEvent, ...repaymentEvents];
    });

    const merged = [...walletEvents, ...derivedEvents];
    const deduped = Array.from(new Map(merged.map((event) => [event.id, event])).values());
    return deduped.sort((left, right) => new Date(right.date) - new Date(left.date));
};

export const downloadMilestonesCsv = (items, fileName) => {
    const rows = [
        ['Title', 'Subtitle', 'Status', 'Direction', 'Amount', 'Date', 'Description'],
        ...items.map((item) => [
            item.title,
            item.subtitle || '',
            item.badge || item.status,
            item.direction || '',
            item.amount || 0,
            item.date || '',
            item.description || '',
        ]),
    ];

    const csv = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};