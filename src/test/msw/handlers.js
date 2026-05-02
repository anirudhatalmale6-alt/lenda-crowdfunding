import { http, HttpResponse } from 'msw';

/**
 * Mock API Handlers for E2E Testing
 * These handlers simulate realistic API responses for the Lenda platform
 */

// Mock Data Store
const mockStore = {
    users: new Map(),
    loans: new Map(),
    escrow: new Map(),
    marketplace: new Map(),
    tokens: new Map(),
};

// Initialize with some test data
const initializeMockData = () => {
    // Mock User
    mockStore.users.set('user-1', {
        id: 'user-1',
        email: 'testuser@lenda.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'borrower',
        kycStatus: 'verified',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f',
        createdAt: '2024-01-01T00:00:00Z',
    });

    // Mock Admin User
    mockStore.users.set('admin-1', {
        id: 'admin-1',
        email: 'admin@lenda.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        kycStatus: 'verified',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595a',
        createdAt: '2024-01-01T00:00:00Z',
    });

    // Mock Lender User
    mockStore.users.set('lender-1', {
        id: 'lender-1',
        email: 'lender@lenda.com',
        firstName: 'Lender',
        lastName: 'User',
        role: 'lender',
        kycStatus: 'verified',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595b',
        createdAt: '2024-01-01T00:00:00Z',
    });

    // Mock Loans
    const mockLoans = [
        {
            id: 'loan-1',
            borrowerId: 'user-1',
            lenderId: 'lender-1',
            title: 'Business Expansion',
            amount: 50000,
            loanAmount: 50000,
            currency: 'NGN',
            interestRate: 12,
            duration: 360,
            durationMonths: 12,
            status: 'ACTIVE',
            collateral: {
                type: 'real_estate',
                value: 100000,
                address: '123 Main St, City, State 12345',
            },
            fundedAmount: 50000,
            repaidAmount: 18750,
            earnedAmount: 2250,
            createdAt: '2026-01-15T00:00:00Z',
            repaymentSchedule: [
                { installment: 1, amount: 5416.67, dueDate: '2026-02-15T00:00:00Z' },
                { installment: 2, amount: 5416.67, dueDate: '2026-03-15T00:00:00Z' },
                { installment: 3, amount: 5416.67, dueDate: '2026-04-15T00:00:00Z' },
                { installment: 4, amount: 5416.67, dueDate: '2026-05-15T00:00:00Z' },
            ],
        },
        {
            id: 'loan-2',
            borrowerId: 'user-1',
            lenderId: 'lender-1',
            title: 'Equipment Purchase',
            amount: 25000,
            loanAmount: 25000,
            currency: 'NGN',
            interestRate: 15,
            duration: 300,
            durationMonths: 10,
            status: 'ACTIVE',
            collateral: {
                type: 'vehicle',
                value: 60000,
                vin: '1HGBH41JXMN109186',
            },
            fundedAmount: 25000,
            repaidAmount: 9400,
            earnedAmount: 1250,
            createdAt: '2026-02-01T00:00:00Z',
            repaymentSchedule: [
                { installment: 1, amount: 2875, dueDate: '2026-03-01T00:00:00Z' },
                { installment: 2, amount: 2875, dueDate: '2026-04-01T00:00:00Z' },
                { installment: 3, amount: 2875, dueDate: '2026-05-01T00:00:00Z' },
                { installment: 4, amount: 2875, dueDate: '2026-06-01T00:00:00Z' },
            ],
        },
        {
            id: 'loan-3',
            borrowerId: 'user-1',
            lenderId: 'lender-1',
            title: 'Inventory Bridge',
            amount: 18000,
            loanAmount: 18000,
            currency: 'NGN',
            interestRate: 14,
            duration: 180,
            durationMonths: 6,
            status: 'REPAID',
            collateral: {
                type: 'inventory',
                value: 30000,
            },
            fundedAmount: 18000,
            repaidAmount: 20100,
            earnedAmount: 2100,
            createdAt: '2025-10-20T00:00:00Z',
            repaymentSchedule: [
                { installment: 1, amount: 3350, dueDate: '2025-11-20T00:00:00Z' },
                { installment: 2, amount: 3350, dueDate: '2025-12-20T00:00:00Z' },
                { installment: 3, amount: 3350, dueDate: '2026-01-20T00:00:00Z' },
                { installment: 4, amount: 3350, dueDate: '2026-02-20T00:00:00Z' },
                { installment: 5, amount: 3350, dueDate: '2026-03-20T00:00:00Z' },
                { installment: 6, amount: 3350, dueDate: '2026-04-20T00:00:00Z' },
            ],
        },
        {
            id: 'loan-4',
            borrowerId: 'user-2',
            title: 'Retail Working Capital',
            amount: 32000,
            loanAmount: 32000,
            currency: 'NGN',
            interestRate: 16,
            duration: 240,
            durationMonths: 8,
            status: 'PENDING',
            collateral: {
                type: 'inventory',
                value: 50000,
            },
            fundedAmount: 0,
            repaidAmount: 0,
            createdAt: '2026-04-10T00:00:00Z',
        },
    ];

    mockLoans.forEach(loan => mockStore.loans.set(loan.id, loan));

    // Mock Escrow Transactions
    const mockEscrows = [
        {
            id: 'escrow-1',
            buyerId: 'user-1',
            sellerId: 'user-3',
            amount: 2500,
            status: 'funded',
            itemDescription: 'MacBook Pro 2023',
            createdAt: '2024-01-10T00:00:00Z',
        },
    ];

    mockEscrows.forEach(escrow => mockStore.escrow.set(escrow.id, escrow));

    // Mock Marketplace Items
    const mockItems = [
        {
            id: 'item-1',
            title: 'Recovered Vehicle - 2022 Honda Civic',
            description: 'Excellent condition, low mileage',
            startingPrice: 15000,
            currentPrice: 17500,
            status: 'active',
            auctionEndDate: '2024-02-15T00:00:00Z',
            sellerId: 'admin-1',
            category: 'vehicle',
            images: [],
            bids: [
                { bidderId: 'user-1', amount: 17500, timestamp: '2024-01-25T00:00:00Z' },
            ],
            createdAt: '2024-01-01T00:00:00Z',
        },
    ];

    mockItems.forEach(item => mockStore.marketplace.set(item.id, item));
};

initializeMockData();

const issueTokenForUser = (userId) => {
    const token = `mock-jwt-token-${userId}-${Date.now()}`;
    mockStore.tokens.set(token, userId);
    return token;
};

const serializeUser = (user) => ({
    ...user,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
});

const getAuthenticatedUser = (request) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.replace('Bearer ', '');
    const userId = mockStore.tokens.get(token);
    return userId ? mockStore.users.get(userId) : null;
};

/**
 * Auth API Handlers
 */
export const authHandlers = [
    // POST /api/auth/login
    http.post('/api/auth/login', async ({ request }) => {
        const body = await request.json();
        const { email, password } = body;

        const user = Array.from(mockStore.users.values()).find(u => u.email === email);

        if (user && password === 'password123') {
            const token = issueTokenForUser(user.id);

            return HttpResponse.json({
                success: true,
                data: {
                    token,
                    user: serializeUser(user),
                },
                message: 'Login successful',
            });
        }

        return HttpResponse.json(
            { success: false, error: 'Invalid credentials' },
            { status: 401 }
        );
    }),

    // POST /api/auth/register
    http.post('/api/auth/register', async ({ request }) => {
        const body = await request.json();
        const { email, password, firstName, lastName, name, role = 'borrower' } = body;

        // Check if user already exists
        const existingUser = Array.from(mockStore.users.values()).find(u => u.email === email);

        if (existingUser) {
            return HttpResponse.json(
                { success: false, error: 'Email already registered' },
                { status: 400 }
            );
        }

        const newId = `user-${Date.now()}`;
        const [derivedFirstName = '', ...restName] = (name || '').trim().split(' ');
        const newUser = {
            id: newId,
            email,
            firstName: firstName || derivedFirstName || 'New',
            lastName: lastName || restName.join(' ') || 'User',
            role,
            kycStatus: 'pending',
            walletAddress: null,
            createdAt: new Date().toISOString(),
        };

        mockStore.users.set(newId, newUser);

        const token = issueTokenForUser(newId);

        return HttpResponse.json({
            success: true,
            data: {
                token,
                user: serializeUser(newUser),
            },
            message: 'Registration successful',
        });
    }),

    // POST /api/auth/google
    http.post('/api/auth/google', async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const requestedRole = body?.role || 'borrower';

        const matchedUser = requestedRole === 'admin'
            ? mockStore.users.get('admin-1')
            : requestedRole === 'lender'
                ? mockStore.users.get('lender-1')
                : mockStore.users.get('user-1');

        const token = issueTokenForUser(matchedUser.id);

        return HttpResponse.json({
            success: true,
            data: {
                token,
                user: serializeUser({
                    ...matchedUser,
                    authProvider: 'google'
                }),
            },
            message: 'Google sign-in successful',
        });
    }),

    // POST /api/auth/logout
    http.post('/api/auth/logout', () => {
        return HttpResponse.json({
            success: true,
            message: 'Logout successful',
        });
    }),

    // GET /api/auth/me
    http.get('/api/auth/me', ({ request }) => {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return HttpResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const userId = mockStore.tokens.get(token);

        if (!userId) {
            return HttpResponse.json(
                { success: false, error: 'Invalid token' },
                { status: 401 }
            );
        }

        const user = mockStore.users.get(userId);

        return HttpResponse.json({
            success: true,
            data: serializeUser(user),
        });
    }),

    // POST /api/auth/forgot-password
    http.post('/api/auth/forgot-password', async ({ request }) => {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return HttpResponse.json(
                { success: false, error: 'Email is required' },
                { status: 400 }
            );
        }

        return HttpResponse.json({
            success: true,
            message: 'Password reset link sent to your email',
        });
    }),

    // POST /api/auth/reset-password
    http.post('/api/auth/reset-password', async ({ request }) => {
        const body = await request.json();
        const { token, password } = body;

        if (!token || !password) {
            return HttpResponse.json(
                { success: false, error: 'Token and password are required' },
                { status: 400 }
            );
        }

        return HttpResponse.json({
            success: true,
            message: 'Password reset successful',
        });
    }),

    // POST /api/auth/kyc
    http.post('/api/auth/kyc', async ({ request }) => {
        const body = await request.json();
        const { documentType, documentNumber } = body;

        if (!documentType || !documentNumber) {
            return HttpResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        return HttpResponse.json({
            success: true,
            data: { ...body, status: 'pending', id: 'kyc-1' },
            message: 'KYC submitted successfully',
        });
    }),

    // GET /api/auth/kyc/status
    http.get('/api/auth/kyc/status', () => {
        return HttpResponse.json({
            success: true,
            data: {
                status: 'verified',
                submittedAt: '2024-01-15T00:00:00Z',
                verifiedAt: '2024-01-16T00:00:00Z',
            },
        });
    }),

    // PUT /api/auth/admin/users/:userId/status
    http.put('/api/auth/admin/users/:userId/status', async ({ params, request }) => {
        const body = await request.json();
        const { status } = body;

        const user = mockStore.users.get(params.userId);
        if (!user) {
            return HttpResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        user.status = status;
        mockStore.users.set(params.userId, user);

        return HttpResponse.json({
            success: true,
            data: user,
            message: 'User status updated',
        });
    }),

    // GET /api/auth/admin/users
    http.get('/api/auth/admin/users', ({ request }) => {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader) {
            return HttpResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const users = Array.from(mockStore.users.values());

        return HttpResponse.json({
            success: true,
            data: {
                users,
                total: users.length,
                page: 1,
                pageSize: 20,
            },
        });
    }),
];

/**
 * Loan API Handlers
 */
export const loanHandlers = [
    // GET /api/loans
    http.get('/api/loans', ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');

        let loans = Array.from(mockStore.loans.values());

        if (status) {
            loans = loans.filter(loan => loan.status === status);
        }

        const start = (page - 1) * limit;
        const paginatedLoans = loans.slice(start, start + limit);

        return HttpResponse.json({
            success: true,
            data: {
                loans: paginatedLoans,
                total: loans.length,
                page,
                pageSize: limit,
                totalPages: Math.ceil(loans.length / limit),
            },
        });
    }),

    // POST /api/loans
    http.post('/api/loans', async ({ request }) => {
        const body = await request.json();
        const { amount, duration, interestRate, collateral } = body;

        if (!amount || !duration || !interestRate || !collateral) {
            return HttpResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const newLoan = {
            id: `loan-${Date.now()}`,
            borrowerId: 'user-1',
            amount,
            currency: 'USDC',
            interestRate,
            duration,
            status: 'pending',
            collateral,
            fundedAmount: 0,
            repaidAmount: 0,
            createdAt: new Date().toISOString(),
        };

        mockStore.loans.set(newLoan.id, newLoan);

        return HttpResponse.json({
            success: true,
            data: newLoan,
            message: 'Loan request created successfully',
        });
    }),

    // GET /api/loans/my-loans
    http.get('/api/loans/my-loans', ({ request }) => {
        const user = getAuthenticatedUser(request);
        const userId = user?.id || 'user-1';
        const userLoans = Array.from(mockStore.loans.values()).filter(
            loan => loan.borrowerId === userId
        );

        return HttpResponse.json({
            success: true,
            data: {
                loans: userLoans,
                total: userLoans.length,
            },
        });
    }),

    // GET /api/loans/my-funded
    http.get('/api/loans/my-funded', ({ request }) => {
        const user = getAuthenticatedUser(request);
        const userId = user?.id || 'lender-1';
        const fundedLoans = Array.from(mockStore.loans.values()).filter(
            (loan) => loan.lenderId === userId && (loan.fundedAmount || 0) > 0
        );

        return HttpResponse.json({
            success: true,
            data: {
                loans: fundedLoans,
                total: fundedLoans.length,
            },
        });
    }),

    // GET /api/loans/:id
    http.get('/api/loans/:id', ({ params }) => {
        const loan = mockStore.loans.get(params.id);

        if (!loan) {
            return HttpResponse.json(
                { success: false, error: 'Loan not found' },
                { status: 404 }
            );
        }

        return HttpResponse.json({
            success: true,
            data: loan,
        });
    }),

    // POST /api/loans/:id/fund
    http.post('/api/loans/:id/fund', async ({ params, request }) => {
        const loan = mockStore.loans.get(params.id);
        const body = await request.json();
        const { amount } = body;

        if (!loan) {
            return HttpResponse.json(
                { success: false, error: 'Loan not found' },
                { status: 404 }
            );
        }

        loan.fundedAmount = (loan.fundedAmount || 0) + amount;
        if (loan.fundedAmount >= loan.amount) {
            loan.status = 'funded';
        }

        mockStore.loans.set(params.id, loan);

        return HttpResponse.json({
            success: true,
            data: loan,
            message: 'Loan funded successfully',
        });
    }),

    // POST /api/loans/:id/repay
    http.post('/api/loans/:id/repay', async ({ params, request }) => {
        const loan = mockStore.loans.get(params.id);
        const body = await request.json();
        const { amount } = body;

        if (!loan) {
            return HttpResponse.json(
                { success: false, error: 'Loan not found' },
                { status: 404 }
            );
        }

        loan.repaidAmount = (loan.repaidAmount || 0) + amount;

        if (loan.repaidAmount >= loan.amount + (loan.amount * loan.interestRate / 100)) {
            loan.status = 'repaid';
        }

        mockStore.loans.set(params.id, loan);

        return HttpResponse.json({
            success: true,
            data: loan,
            message: 'Repayment processed successfully',
        });
    }),

    // POST /api/loans/:id/approve (Admin)
    http.post('/api/loans/:id/approve', ({ params }) => {
        const loan = mockStore.loans.get(params.id);

        if (!loan) {
            return HttpResponse.json(
                { success: false, error: 'Loan not found' },
                { status: 404 }
            );
        }

        loan.status = 'approved';
        mockStore.loans.set(params.id, loan);

        return HttpResponse.json({
            success: true,
            data: loan,
            message: 'Loan approved successfully',
        });
    }),

    // POST /api/loans/:id/reject (Admin)
    http.post('/api/loans/:id/reject', async ({ params, request }) => {
        const loan = mockStore.loans.get(params.id);
        const body = await request.json();
        const { reason } = body;

        if (!loan) {
            return HttpResponse.json(
                { success: false, error: 'Loan not found' },
                { status: 404 }
            );
        }

        loan.status = 'rejected';
        loan.rejectionReason = reason;
        mockStore.loans.set(params.id, loan);

        return HttpResponse.json({
            success: true,
            data: loan,
            message: 'Loan rejected',
        });
    }),

    // GET /api/loans/statistics
    http.get('/api/loans/statistics', () => {
        const loans = Array.from(mockStore.loans.values());
        const totalLoans = loans.length;
        const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'funded').length;
        const totalValue = loans.reduce((sum, l) => sum + l.amount, 0);
        const totalFunded = loans.reduce((sum, l) => sum + (l.fundedAmount || 0), 0);

        return HttpResponse.json({
            success: true,
            data: {
                totalLoans,
                activeLoans,
                pendingLoans: loans.filter(l => l.status === 'pending').length,
                completedLoans: loans.filter(l => l.status === 'repaid').length,
                totalValue,
                totalFunded,
                averageInterestRate: 12.5,
            },
        });
    }),

    // GET /api/loans/calculate-ltv
    http.get('/api/loans/calculate-ltv', ({ request }) => {
        const url = new URL(request.url);
        const loanAmount = parseFloat(url.searchParams.get('loanAmount'));
        const collateralValue = parseFloat(url.searchParams.get('collateralValue'));

        const ltv = (loanAmount / collateralValue) * 100;

        return HttpResponse.json({
            success: true,
            data: {
                ltv: ltv.toFixed(2),
                maxLtv: 70,
                isEligible: ltv <= 70,
            },
        });
    }),

    // POST /api/loans/:id/cancel
    http.post('/api/loans/:id/cancel', ({ params }) => {
        const loan = mockStore.loans.get(params.id);

        if (!loan) {
            return HttpResponse.json(
                { success: false, error: 'Loan not found' },
                { status: 404 }
            );
        }

        if (loan.status !== 'pending') {
            return HttpResponse.json(
                { success: false, error: 'Cannot cancel active loan' },
                { status: 400 }
            );
        }

        loan.status = 'cancelled';
        mockStore.loans.set(params.id, loan);

        return HttpResponse.json({
            success: true,
            data: loan,
            message: 'Loan cancelled',
        });
    }),

    // GET /api/loans/:id/schedule
    http.get('/api/loans/:id/schedule', ({ params }) => {
        const loan = mockStore.loans.get(params.id);

        if (!loan) {
            return HttpResponse.json(
                { success: false, error: 'Loan not found' },
                { status: 404 }
            );
        }

        if (Array.isArray(loan.repaymentSchedule)) {
            return HttpResponse.json({
                success: true,
                data: {
                    loanId: params.id,
                    payments: loan.repaymentSchedule,
                    totalAmount: loan.repaymentSchedule.reduce((sum, payment) => sum + payment.amount, 0),
                    remainingBalance: Math.max((loan.loanAmount || loan.amount || 0) - (loan.repaidAmount || 0), 0),
                },
            });
        }

        const monthlyPayment = loan.amount / Math.max((loan.duration / 30), 1);
        const interest = loan.amount * (loan.interestRate / 100) / 12;
        const totalPayment = monthlyPayment + interest;

        return HttpResponse.json({
            success: true,
            data: {
                loanId: params.id,
                payments: Array.from({ length: loan.duration / 30 }, (_, i) => ({
                    installment: i + 1,
                    amount: totalPayment,
                    dueDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                })),
                totalAmount: totalPayment * (loan.duration / 30),
                remainingBalance: loan.amount,
            },
        });
    }),
];

/**
 * Escrow API Handlers
 */
export const escrowHandlers = [
    // GET /api/escrow
    http.get('/api/escrow', () => {
        const escrows = Array.from(mockStore.escrow.values());

        return HttpResponse.json({
            success: true,
            data: {
                transactions: escrows,
                total: escrows.length,
            },
        });
    }),

    // POST /api/escrow
    http.post('/api/escrow', async ({ request }) => {
        const body = await request.json();
        const { amount, itemDescription, sellerId } = body;

        if (!amount || !itemDescription || !sellerId) {
            return HttpResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const newEscrow = {
            id: `escrow-${Date.now()}`,
            buyerId: 'user-1',
            sellerId,
            amount,
            status: 'pending',
            itemDescription,
            createdAt: new Date().toISOString(),
        };

        mockStore.escrow.set(newEscrow.id, newEscrow);

        return HttpResponse.json({
            success: true,
            data: newEscrow,
            message: 'Escrow transaction created',
        });
    }),

    // GET /api/escrow/my-transactions
    http.get('/api/escrow/my-transactions', () => {
        const transactions = Array.from(mockStore.escrow.values()).filter(
            t => t.buyerId === 'user-1' || t.sellerId === 'user-1'
        );

        return HttpResponse.json({
            success: true,
            data: transactions,
        });
    }),

    // GET /api/escrow/:id
    http.get('/api/escrow/:id', ({ params }) => {
        const escrow = mockStore.escrow.get(params.id);

        if (!escrow) {
            return HttpResponse.json(
                { success: false, error: 'Transaction not found' },
                { status: 404 }
            );
        }

        return HttpResponse.json({
            success: true,
            data: escrow,
        });
    }),

    // POST /api/escrow/:id/fund
    http.post('/api/escrow/:id/fund', ({ params }) => {
        const escrow = mockStore.escrow.get(params.id);

        if (!escrow) {
            return HttpResponse.json(
                { success: false, error: 'Transaction not found' },
                { status: 404 }
            );
        }

        escrow.status = 'funded';
        mockStore.escrow.set(params.id, escrow);

        return HttpResponse.json({
            success: true,
            data: escrow,
            message: 'Escrow funded successfully',
        });
    }),

    // POST /api/escrow/:id/ship
    http.post('/api/escrow/:id/ship', async ({ params, request }) => {
        const escrow = mockStore.escrow.get(params.id);
        const body = await request.json();
        const { trackingNumber } = body;

        if (!escrow) {
            return HttpResponse.json(
                { success: false, error: 'Transaction not found' },
                { status: 404 }
            );
        }

        escrow.status = 'shipped';
        escrow.trackingNumber = trackingNumber;
        mockStore.escrow.set(params.id, escrow);

        return HttpResponse.json({
            success: true,
            data: escrow,
            message: 'Item marked as shipped',
        });
    }),

    // POST /api/escrow/:id/confirm
    http.post('/api/escrow/:id/confirm', ({ params }) => {
        const escrow = mockStore.escrow.get(params.id);

        if (!escrow) {
            return HttpResponse.json(
                { success: false, error: 'Transaction not found' },
                { status: 404 }
            );
        }

        escrow.status = 'delivered';
        mockStore.escrow.set(params.id, escrow);

        return HttpResponse.json({
            success: true,
            data: escrow,
            message: 'Delivery confirmed',
        });
    }),

    // POST /api/escrow/:id/release
    http.post('/api/escrow/:id/release', ({ params }) => {
        const escrow = mockStore.escrow.get(params.id);

        if (!escrow) {
            return HttpResponse.json(
                { success: false, error: 'Transaction not found' },
                { status: 404 }
            );
        }

        escrow.status = 'released';
        mockStore.escrow.set(params.id, escrow);

        return HttpResponse.json({
            success: true,
            data: escrow,
            message: 'Funds released to seller',
        });
    }),

    // POST /api/escrow/:id/dispute
    http.post('/api/escrow/:id/dispute', async ({ params, request }) => {
        const escrow = mockStore.escrow.get(params.id);
        const body = await request.json();
        const { reason } = body;

        if (!escrow) {
            return HttpResponse.json(
                { success: false, error: 'Transaction not found' },
                { status: 404 }
            );
        }

        escrow.status = 'disputed';
        escrow.disputeReason = reason;
        mockStore.escrow.set(params.id, escrow);

        return HttpResponse.json({
            success: true,
            data: escrow,
            message: 'Dispute opened',
        });
    }),

    // GET /api/escrow/statistics
    http.get('/api/escrow/statistics', () => {
        const escrows = Array.from(mockStore.escrow.values());

        return HttpResponse.json({
            success: true,
            data: {
                totalTransactions: escrows.length,
                activeTransactions: escrows.filter(e => e.status === 'funded' || e.status === 'shipped').length,
                completedTransactions: escrows.filter(e => e.status === 'released').length,
                disputedTransactions: escrows.filter(e => e.status === 'disputed').length,
                totalValue: escrows.reduce((sum, e) => sum + e.amount, 0),
            },
        });
    }),
];

/**
 * Marketplace API Handlers
 */
export const marketplaceHandlers = [
    // GET /api/marketplace
    http.get('/api/marketplace', ({ request }) => {
        const url = new URL(request.url);
        const category = url.searchParams.get('category');
        const status = url.searchParams.get('status');

        let items = Array.from(mockStore.marketplace.values());

        if (category) {
            items = items.filter(item => item.category === category);
        }

        if (status) {
            items = items.filter(item => item.status === status);
        }

        return HttpResponse.json({
            success: true,
            data: {
                items,
                total: items.length,
            },
        });
    }),

    // GET /api/marketplace/featured
    http.get('/api/marketplace/featured', () => {
        const items = Array.from(mockStore.marketplace.values())
            .filter(item => item.status === 'active')
            .slice(0, 6);

        return HttpResponse.json({
            success: true,
            data: items,
        });
    }),

    // GET /api/marketplace/:id
    http.get('/api/marketplace/:id', ({ params }) => {
        const item = mockStore.marketplace.get(params.id);

        if (!item) {
            return HttpResponse.json(
                { success: false, error: 'Item not found' },
                { status: 404 }
            );
        }

        return HttpResponse.json({
            success: true,
            data: item,
        });
    }),

    // POST /api/marketplace/:id/bid
    http.post('/api/marketplace/:id/bid', async ({ params, request }) => {
        const item = mockStore.marketplace.get(params.id);
        const body = await request.json();
        const { amount } = body;

        if (!item) {
            return HttpResponse.json(
                { success: false, error: 'Item not found' },
                { status: 404 }
            );
        }

        if (amount <= item.currentPrice) {
            return HttpResponse.json(
                { success: false, error: 'Bid must be higher than current price' },
                { status: 400 }
            );
        }

        const newBid = {
            bidderId: 'user-1',
            amount,
            timestamp: new Date().toISOString(),
        };

        item.bids.push(newBid);
        item.currentPrice = amount;
        mockStore.marketplace.set(params.id, item);

        return HttpResponse.json({
            success: true,
            data: item,
            message: 'Bid placed successfully',
        });
    }),

    // POST /api/marketplace/:id/buy
    http.post('/api/marketplace/:id/buy', ({ params }) => {
        const item = mockStore.marketplace.get(params.id);

        if (!item) {
            return HttpResponse.json(
                { success: false, error: 'Item not found' },
                { status: 404 }
            );
        }

        item.status = 'sold';
        item.buyerId = 'user-1';
        item.soldAt = new Date().toISOString();
        mockStore.marketplace.set(params.id, item);

        return HttpResponse.json({
            success: true,
            data: item,
            message: 'Purchase successful',
        });
    }),

    // GET /api/marketplace/my-bids
    http.get('/api/marketplace/my-bids', () => {
        const items = Array.from(mockStore.marketplace.values()).filter(
            item => item.bids.some(bid => bid.bidderId === 'user-1')
        );

        return HttpResponse.json({
            success: true,
            data: items,
        });
    }),

    // GET /api/marketplace/my-purchases
    http.get('/api/marketplace/my-purchases', () => {
        const items = Array.from(mockStore.marketplace.values()).filter(
            item => item.buyerId === 'user-1'
        );

        return HttpResponse.json({
            success: true,
            data: items,
        });
    }),

    // GET /api/marketplace/:id/history
    http.get('/api/marketplace/:id/history', ({ params }) => {
        const item = mockStore.marketplace.get(params.id);

        if (!item) {
            return HttpResponse.json(
                { success: false, error: 'Item not found' },
                { status: 404 }
            );
        }

        return HttpResponse.json({
            success: true,
            data: item.bids,
        });
    }),

    // GET /api/marketplace/statistics
    http.get('/api/marketplace/statistics', () => {
        const items = Array.from(mockStore.marketplace.values());

        return HttpResponse.json({
            success: true,
            data: {
                totalListings: items.length,
                activeListings: items.filter(i => i.status === 'active').length,
                soldListings: items.filter(i => i.status === 'sold').length,
                totalValue: items.reduce((sum, i) => sum + i.currentPrice, 0),
                averagePrice: items.length > 0
                    ? items.reduce((sum, i) => sum + i.currentPrice, 0) / items.length
                    : 0,
            },
        });
    }),
];

/**
 * Wallet API Handlers
 */
export const walletHandlers = [
    // GET /api/wallet
    http.get('/api/wallet', () => {
        return HttpResponse.json({
            success: true,
            data: {
                wallets: [
                    {
                        id: 'wallet-1',
                        type: 'main',
                        currency: 'USD',
                        balance: 10000.00,
                        availableBalance: 8500.00,
                        pendingBalance: 1500.00,
                        createdAt: '2024-01-01T00:00:00Z',
                    },
                    {
                        id: 'wallet-2',
                        type: 'escrow',
                        currency: 'USD',
                        balance: 5000.00,
                        availableBalance: 5000.00,
                        pendingBalance: 0,
                        createdAt: '2024-01-15T00:00:00Z',
                    },
                ],
                total: 2,
            },
        });
    }),

    // GET /api/wallet/transactions
    http.get('/api/wallet/transactions', ({ request }) => {
        const url = new URL(request.url);
        const type = url.searchParams.get('type');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');

        const user = getAuthenticatedUser(request);
        const isLender = user?.role === 'lender';
        const transactions = isLender
            ? [
                {
                    id: 'wallet-tx-1',
                    type: 'DEPOSIT',
                    amount: 15000,
                    currency: 'NGN',
                    status: 'COMPLETED',
                    description: 'Wallet funded for lending',
                    createdAt: '2026-01-28T00:00:00Z',
                },
                {
                    id: 'wallet-tx-2',
                    type: 'LENDER_INVESTMENT',
                    amount: 10000,
                    currency: 'NGN',
                    status: 'COMPLETED',
                    description: 'Investment deployed into Business Expansion',
                    createdAt: '2026-02-01T00:00:00Z',
                },
                {
                    id: 'wallet-tx-3',
                    type: 'LENDER_REPAYMENT',
                    amount: 5416.67,
                    currency: 'NGN',
                    status: 'COMPLETED',
                    description: 'Repayment credited from Business Expansion',
                    createdAt: '2026-04-15T00:00:00Z',
                },
            ]
            : [
                {
                    id: 'wallet-tx-4',
                    type: 'LOAN_DISBURSEMENT',
                    amount: 50000,
                    currency: 'NGN',
                    status: 'COMPLETED',
                    description: 'Business Expansion loan disbursement',
                    createdAt: '2026-01-15T00:00:00Z',
                },
                {
                    id: 'wallet-tx-5',
                    type: 'LOAN_REPAYMENT',
                    amount: 5416.67,
                    currency: 'NGN',
                    status: 'COMPLETED',
                    description: 'Business Expansion repayment processed',
                    createdAt: '2026-04-15T00:00:00Z',
                },
                {
                    id: 'wallet-tx-6',
                    type: 'LOAN_REPAYMENT',
                    amount: 2875,
                    currency: 'NGN',
                    status: 'PENDING',
                    description: 'Equipment Purchase repayment pending confirmation',
                    createdAt: '2026-05-01T00:00:00Z',
                },
            ];

        let filteredTransactions = transactions;
        if (type) {
            filteredTransactions = transactions.filter(tx => tx.type === type);
        }

        const start = (page - 1) * limit;
        const paginatedTransactions = filteredTransactions.slice(start, start + limit);

        return HttpResponse.json({
            success: true,
            data: {
                transactions: paginatedTransactions,
                total: filteredTransactions.length,
                page,
                pageSize: limit,
                totalPages: Math.ceil(filteredTransactions.length / limit),
            },
        });
    }),

    // POST /api/wallet/deposit
    http.post('/api/wallet/deposit', async ({ request }) => {
        const body = await request.json();
        const { amount, currency } = body;

        if (!amount || amount <= 0) {
            return HttpResponse.json(
                { success: false, error: 'Invalid amount' },
                { status: 400 }
            );
        }

        return HttpResponse.json({
            success: true,
            data: {
                id: `tx-${Date.now()}`,
                type: 'deposit',
                amount,
                currency: currency || 'USD',
                status: 'pending',
                description: 'Bank transfer deposit',
                createdAt: new Date().toISOString(),
            },
            message: 'Deposit initiated successfully',
        });
    }),

    // POST /api/wallet/withdraw
    http.post('/api/wallet/withdraw', async ({ request }) => {
        const body = await request.json();
        const { amount, address } = body;

        if (!amount || amount <= 0) {
            return HttpResponse.json(
                { success: false, error: 'Invalid amount' },
                { status: 400 }
            );
        }

        if (!address) {
            return HttpResponse.json(
                { success: false, error: 'Withdrawal address is required' },
                { status: 400 }
            );
        }

        return HttpResponse.json({
            success: true,
            data: {
                id: `tx-${Date.now()}`,
                type: 'withdrawal',
                amount,
                currency: 'USD',
                status: 'pending',
                address,
                description: 'Withdrawal request',
                createdAt: new Date().toISOString(),
            },
            message: 'Withdrawal initiated successfully',
        });
    }),

    // POST /api/wallet/transfer
    http.post('/api/wallet/transfer', async ({ request }) => {
        const body = await request.json();
        const { toWallet, amount } = body;

        if (!toWallet) {
            return HttpResponse.json(
                { success: false, error: 'Recipient wallet is required' },
                { status: 400 }
            );
        }

        if (!amount || amount <= 0) {
            return HttpResponse.json(
                { success: false, error: 'Invalid amount' },
                { status: 400 }
            );
        }

        return HttpResponse.json({
            success: true,
            data: {
                id: `tx-${Date.now()}`,
                type: 'transfer',
                amount,
                currency: 'USD',
                toWallet,
                status: 'completed',
                description: 'Wallet transfer',
                createdAt: new Date().toISOString(),
            },
            message: 'Transfer completed successfully',
        });
    }),

    // GET /api/wallet/deposit-address/:currency
    http.get('/api/wallet/deposit-address/:currency', ({ params }) => {
        const { currency } = params;

        return HttpResponse.json({
            success: true,
            data: {
                currency: currency || 'ETH',
                address: '0x742d35Cc6634C0532925a3b844Bc9e7595f',
                qrCode: 'data:image/png;base64,mockqrcode',
                network: currency === 'ETH' ? 'Ethereum' : 'Bitcoin',
            },
        });
    }),

    // GET /api/wallet/balance/:walletType
    http.get('/api/wallet/balance/:walletType', ({ params }) => {
        const { walletType } = params;

        const balances = {
            main: {
                balance: 10000.00,
                availableBalance: 8500.00,
                pendingBalance: 1500.00,
            },
            escrow: {
                balance: 5000.00,
                availableBalance: 5000.00,
                pendingBalance: 0,
            },
            loan: {
                balance: 2500.00,
                availableBalance: 2000.00,
                pendingBalance: 500.00,
            },
        };

        const walletBalance = balances[walletType] || balances.main;

        return HttpResponse.json({
            success: true,
            data: walletBalance,
        });
    }),

    // GET /api/wallet/history
    http.get('/api/wallet/history', ({ request }) => {
        const user = getAuthenticatedUser(request);
        const isLender = user?.role === 'lender';

        const transactions = isLender
            ? [
                {
                    id: 'lender-history-1',
                    type: 'DEPOSIT',
                    amount: 15000,
                    currency: 'NGN',
                    status: 'COMPLETED',
                    description: 'Wallet funded for lending',
                    createdAt: '2026-01-28T00:00:00Z',
                },
                {
                    id: 'lender-history-2',
                    type: 'LENDER_INVESTMENT',
                    amount: 10000,
                    currency: 'NGN',
                    status: 'COMPLETED',
                    description: 'Investment deployed into Business Expansion',
                    createdAt: '2026-02-01T00:00:00Z',
                },
                {
                    id: 'lender-history-3',
                    type: 'LENDER_REPAYMENT',
                    amount: 5416.67,
                    currency: 'NGN',
                    status: 'COMPLETED',
                    description: 'Repayment credited from Business Expansion',
                    createdAt: '2026-04-15T00:00:00Z',
                },
                {
                    id: 'lender-history-4',
                    type: 'LENDER_REPAYMENT',
                    amount: 2875,
                    currency: 'NGN',
                    status: 'PENDING',
                    description: 'Upcoming repayment from Equipment Purchase',
                    createdAt: '2026-05-01T00:00:00Z',
                },
            ]
            : [
                {
                    id: 'borrower-history-1',
                    type: 'LOAN_DISBURSEMENT',
                    amount: 50000,
                    currency: 'NGN',
                    status: 'COMPLETED',
                    description: 'Business Expansion loan disbursement',
                    createdAt: '2026-01-15T00:00:00Z',
                },
                {
                    id: 'borrower-history-2',
                    type: 'LOAN_REPAYMENT',
                    amount: 5416.67,
                    currency: 'NGN',
                    status: 'COMPLETED',
                    description: 'Business Expansion repayment processed',
                    createdAt: '2026-04-15T00:00:00Z',
                },
                {
                    id: 'borrower-history-3',
                    type: 'LOAN_REPAYMENT',
                    amount: 2875,
                    currency: 'NGN',
                    status: 'PENDING',
                    description: 'Equipment Purchase repayment pending confirmation',
                    createdAt: '2026-05-01T00:00:00Z',
                },
            ];

        return HttpResponse.json({
            success: true,
            data: {
                transactions,
                total: transactions.length,
            },
        });
    }),

    // POST /api/wallet/request-withdrawal
    http.post('/api/wallet/request-withdrawal', async ({ request }) => {
        const body = await request.json();
        const { amount, address, method } = body;

        if (!amount || amount <= 0) {
            return HttpResponse.json(
                { success: false, error: 'Invalid amount' },
                { status: 400 }
            );
        }

        if (!address) {
            return HttpResponse.json(
                { success: false, error: 'Withdrawal address is required' },
                { status: 400 }
            );
        }

        return HttpResponse.json({
            success: true,
            data: {
                id: `withdrawal-${Date.now()}`,
                amount,
                address,
                method: method || 'bank',
                status: 'pending',
                createdAt: new Date().toISOString(),
            },
            message: 'Withdrawal request submitted successfully',
        });
    }),

    // GET /api/wallet/currencies
    http.get('/api/wallet/currencies', () => {
        return HttpResponse.json({
            success: true,
            data: {
                currencies: [
                    { code: 'USD', name: 'US Dollar', symbol: 'USD', type: 'fiat' },
                    { code: 'EUR', name: 'Euro', symbol: 'EUR', type: 'fiat' },
                    { code: 'GBP', name: 'British Pound', symbol: 'GBP', type: 'fiat' },
                    { code: 'ETH', name: 'Ethereum', symbol: 'ETH', type: 'crypto' },
                    { code: 'BTC', name: 'Bitcoin', symbol: 'BTC', type: 'crypto' },
                    { code: 'USDC', name: 'USD Coin', symbol: 'USDC', type: 'crypto' },
                ],
            },
        });
    }),

    // GET /api/wallet/statistics
    http.get('/api/wallet/statistics', () => {
        return HttpResponse.json({
            success: true,
            data: {
                totalBalance: 15000.00,
                availableBalance: 13500.00,
                pendingBalance: 1500.00,
                totalDeposits: 25000.00,
                totalWithdrawals: 10000.00,
                totalTransactions: 15,
                averageTransactionAmount: 1000.00,
            },
        });
    }),
];

export const creditHandlers = [
    http.get('/api/credit/borrower/score/:borrowerId', ({ params }) => {
        const { borrowerId } = params;

        return HttpResponse.json({
            borrower_id: borrowerId,
            credit_score: 742,
            credit_category: 'good',
            updated_at: '2026-04-30T00:00:00Z',
            statistics: {
                total_loans: 3,
                successful_loans: 2,
                active_loans: 2,
                total_borrowed: 93000,
                repayment_rate: 94,
                on_time_payments: 11,
                missed_payments: 1,
            },
            factors: {
                repayment_history: 88,
                loan_completion: 76,
                collateral_quality: 72,
                account_longevity: 64,
                marketplace_reputation: 71,
            },
        });
    }),

    http.get('/api/credit/borrower/badges/:borrowerId', ({ params }) => {
        const { borrowerId } = params;

        return HttpResponse.json([
            { id: `badge-${borrowerId}-1`, type: 'reliable_borrower', name: 'Reliable Borrower', color: 'green' },
            { id: `badge-${borrowerId}-2`, type: 'collateral_verified', name: 'Collateral Verified', color: 'blue' },
        ].reduce((acc, badge) => {
            acc.badges.push(badge);
            return acc;
        }, { badges: [] }));
    }),

    http.get('/api/credit/signals/:borrowerId/:loanId', ({ params }) => {
        const { borrowerId, loanId } = params;

        return HttpResponse.json([
            {
                id: `signal-${borrowerId}-${loanId}-1`,
                signal_type: 'consistent_performance',
                label: 'Excellent Track Record',
                description: 'Borrower has maintained a strong repayment pattern on related facilities.',
                recommendation: 'Suitable for standard marketplace exposure.',
                color: 'green',
                loan_id: loanId,
            },
        ].reduce((acc, signal) => {
            acc.signals.push(signal);
            return acc;
        }, { signals: [] }));
    }),

    http.get('/api/credit/admin/monitoring', () => {
        return HttpResponse.json({
            portfolioAverageScore: 701,
            activeBorrowers: 42,
            improvedThisMonth: 17,
            watchlistCount: 3,
        });
    }),
];

export const capitalHandlers = [
    http.get('/api/capital/platform-stability', () => {
        return HttpResponse.json({
            platform_stability: {
                reserve_coverage: 82,
                default_rate: 3.1,
                collateral_coverage: 164,
                guarantee_reserve: 2750000,
                outstanding_loans: 9100000,
                system_health: 'Healthy',
                updated_at: '2026-04-30T00:00:00Z',
            },
        });
    }),

    http.get('/api/capital/reserve-status', () => {
        return HttpResponse.json({
            reserve_status: {
                pool_balance: 2750000,
                available_reserve: 2250000,
                locked_reserve: 500000,
            },
        });
    }),

    http.get('/api/capital/coverage-ratio', () => {
        return HttpResponse.json({
            coverage_ratio: {
                current_ratio: 82,
                minimum_required: 65,
                target_ratio: 90,
            },
        });
    }),

    http.get('/api/capital/system-health', () => {
        return HttpResponse.json({
            system_health: {
                status: 'healthy',
                incidents: 0,
                last_stress_test: '2026-04-28T10:00:00Z',
            },
        });
    }),
];

// Export all handlers
export const handlers = [
    ...authHandlers,
    ...loanHandlers,
    ...escrowHandlers,
    ...marketplaceHandlers,
    ...walletHandlers,
    ...creditHandlers,
    ...capitalHandlers,
];
