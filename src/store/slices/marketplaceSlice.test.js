import { describe, it, expect, beforeEach } from 'vitest';
import marketplaceReducer, {
    setFilters,
    resetFilters,
    setPage,
    clearItemDetails,
    clearError,
} from './marketplaceSlice';

describe('marketplaceSlice', () => {
    const initialState = {
        recoveryItems: [],
        recoveryListings: [],
        featuredItems: [],
        itemDetails: null,
        myBids: [],
        isLoading: false,
        error: null,
        filters: {
            type: 'all',
            status: 'all',
            minPrice: 0,
            maxPrice: 1000000,
        },
        pagination: {
            page: 1,
            limit: 12,
            total: 0,
        },
    };

    it('should return the initial state', () => {
        const result = marketplaceReducer(undefined, { type: 'unknown' });
        expect(result.recoveryItems).toEqual([]);
        expect(result.recoveryListings).toEqual([]);
        expect(result.featuredItems).toEqual([]);
        expect(result.itemDetails).toBe(null);
        expect(result.myBids).toEqual([]);
        expect(result.isLoading).toBe(false);
        expect(result.error).toBe(null);
        expect(result.filters.type).toBe('all');
        expect(result.filters.status).toBe('all');
        expect(result.filters.minPrice).toBe(0);
        expect(result.filters.maxPrice).toBe(1000000);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(12);
        expect(result.pagination.total).toBe(0);
    });

    describe('setFilters', () => {
        it('should set type filter', () => {
            const result = marketplaceReducer(initialState, setFilters({ type: 'vehicle' }));
            expect(result.filters.type).toBe('vehicle');
        });

        it('should set status filter', () => {
            const result = marketplaceReducer(initialState, setFilters({ status: 'active' }));
            expect(result.filters.status).toBe('active');
        });

        it('should set price filters', () => {
            const result = marketplaceReducer(
                initialState,
                setFilters({ minPrice: 5000, maxPrice: 50000 })
            );
            expect(result.filters.minPrice).toBe(5000);
            expect(result.filters.maxPrice).toBe(50000);
        });

        it('should set multiple filters at once', () => {
            const result = marketplaceReducer(
                initialState,
                setFilters({ type: 'property', status: 'auction', minPrice: 10000 })
            );
            expect(result.filters.type).toBe('property');
            expect(result.filters.status).toBe('auction');
            expect(result.filters.minPrice).toBe(10000);
            expect(result.filters.maxPrice).toBe(1000000);
        });

        it('should preserve existing filters when setting new ones', () => {
            const stateWithFilters = {
                ...initialState,
                filters: { type: 'vehicle', status: 'active', minPrice: 5000, maxPrice: 50000 },
            };
            const result = marketplaceReducer(stateWithFilters, setFilters({ type: 'property' }));
            expect(result.filters.type).toBe('property');
            expect(result.filters.status).toBe('active');
            expect(result.filters.minPrice).toBe(5000);
        });
    });

    describe('resetFilters', () => {
        it('should reset filters to initial state', () => {
            const stateWithFilters = {
                ...initialState,
                filters: { type: 'equipment', status: 'negotiation', minPrice: 20000, maxPrice: 100000 },
            };
            const result = marketplaceReducer(stateWithFilters, resetFilters());
            expect(result.filters.type).toBe('all');
            expect(result.filters.status).toBe('all');
            expect(result.filters.minPrice).toBe(0);
            expect(result.filters.maxPrice).toBe(1000000);
        });
    });

    describe('setPage', () => {
        it('should set pagination page', () => {
            const result = marketplaceReducer(initialState, setPage(3));
            expect(result.pagination.page).toBe(3);
        });

        it('should handle setting page to 1', () => {
            const stateWithPage = { ...initialState, pagination: { ...initialState.pagination, page: 5 } };
            const result = marketplaceReducer(stateWithPage, setPage(1));
            expect(result.pagination.page).toBe(1);
        });
    });

    describe('clearItemDetails', () => {
        it('should clear item details', () => {
            const stateWithDetails = {
                ...initialState,
                itemDetails: { id: 1, name: 'Test Item', price: 5000 },
            };
            const result = marketplaceReducer(stateWithDetails, clearItemDetails());
            expect(result.itemDetails).toBe(null);
        });
    });

    describe('clearError', () => {
        it('should clear error', () => {
            const stateWithError = {
                ...initialState,
                error: 'Some error occurred',
            };
            const result = marketplaceReducer(stateWithError, clearError());
            expect(result.error).toBe(null);
        });
    });

    describe('async thunk extraReducers', () => {
        describe('getRecoveryItems', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'marketplace/getItems/pending' };
                const result = marketplaceReducer(initialState, action);
                expect(result.isLoading).toBe(true);
            });

            it('should set recoveryItems on fulfilled', () => {
                const payload = {
                    items: [{ id: 1 }, { id: 2 }],
                    pagination: { page: 1, limit: 12, total: 2 },
                };
                const action = { type: 'marketplace/getItems/fulfilled', payload };
                const result = marketplaceReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.recoveryItems).toHaveLength(2);
                expect(result.pagination.total).toBe(2);
            });

            it('should set error on rejected', () => {
                const action = { type: 'marketplace/getItems/rejected', payload: 'Failed to fetch items' };
                const result = marketplaceReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Failed to fetch items');
            });
        });

        describe('getFeaturedItems', () => {
            it('should set featuredItems on fulfilled', () => {
                const payload = { items: [{ id: 1, featured: true }, { id: 2, featured: true }] };
                const action = { type: 'marketplace/getFeatured/fulfilled', payload };
                const result = marketplaceReducer(initialState, action);
                expect(result.featuredItems).toHaveLength(2);
            });
        });

        describe('getItemDetails', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'marketplace/getItemDetails/pending' };
                const result = marketplaceReducer(initialState, action);
                expect(result.isLoading).toBe(true);
            });

            it('should set itemDetails on fulfilled', () => {
                const item = { id: 1, name: 'Luxury Car', price: 50000, status: 'active' };
                const action = { type: 'marketplace/getItemDetails/fulfilled', payload: item };
                const result = marketplaceReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.itemDetails).toEqual(item);
            });

            it('should set error on rejected', () => {
                const action = { type: 'marketplace/getItemDetails/rejected', payload: 'Item not found' };
                const result = marketplaceReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Item not found');
            });
        });

        describe('placeBid', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'marketplace/placeBid/pending' };
                const result = marketplaceReducer(initialState, action);
                expect(result.isLoading).toBe(true);
            });

            it('should update itemDetails on fulfilled', () => {
                const payload = { item: { id: 1, currentBid: 55000 } };
                const stateWithDetails = {
                    ...initialState,
                    itemDetails: { id: 1, currentBid: 50000 },
                };
                const action = { type: 'marketplace/placeBid/fulfilled', payload };
                const result = marketplaceReducer(stateWithDetails, action);
                expect(result.isLoading).toBe(false);
                expect(result.itemDetails.currentBid).toBe(55000);
            });

            it('should set error on rejected', () => {
                const action = { type: 'marketplace/placeBid/rejected', payload: 'Bid too low' };
                const result = marketplaceReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Bid too low');
            });
        });

        describe('buyNow', () => {
            it('should remove item from recoveryItems on fulfilled', () => {
                const purchasedItem = { id: 1, status: 'SOLD' };
                const stateWithItems = {
                    ...initialState,
                    recoveryItems: [{ id: 1 }, { id: 2 }, { id: 3 }],
                };
                const action = { type: 'marketplace/buyNow/fulfilled', payload: purchasedItem };
                const result = marketplaceReducer(stateWithItems, action);
                expect(result.recoveryItems).toHaveLength(2);
            });
        });

        describe('getMyBids', () => {
            it('should set myBids on fulfilled', () => {
                const payload = { bids: [{ id: 1, amount: 5000 }, { id: 2, amount: 7500 }] };
                const action = { type: 'marketplace/getMyBids/fulfilled', payload };
                const result = marketplaceReducer(initialState, action);
                expect(result.myBids).toHaveLength(2);
            });
        });

        describe('getRecoveryListings (admin)', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'marketplace/getRecoveryListings/pending' };
                const result = marketplaceReducer(initialState, action);
                expect(result.isLoading).toBe(true);
            });

            it('should set recoveryListings on fulfilled', () => {
                const payload = { listings: [{ id: 1, status: 'PENDING' }] };
                const action = { type: 'marketplace/getRecoveryListings/fulfilled', payload };
                const result = marketplaceReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.recoveryListings).toHaveLength(1);
            });

            it('should set error on rejected', () => {
                const action = { type: 'marketplace/getRecoveryListings/rejected', payload: 'Access denied' };
                const result = marketplaceReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Access denied');
            });
        });

        describe('approveRecoveryListing (admin)', () => {
            it('should update listing in recoveryListings on fulfilled', () => {
                const payload = { listing: { id: 1, status: 'APPROVED' } };
                const stateWithListings = {
                    ...initialState,
                    recoveryListings: [
                        { id: 1, status: 'PENDING' },
                        { id: 2, status: 'PENDING' },
                    ],
                };
                const action = { type: 'marketplace/approveRecoveryListing/fulfilled', payload };
                const result = marketplaceReducer(stateWithListings, action);
                expect(result.recoveryListings[0].status).toBe('APPROVED');
            });
        });

        describe('processRecoverySale (admin)', () => {
            it('should update listing in recoveryListings on fulfilled', () => {
                const payload = { listing: { id: 1, status: 'SOLD' } };
                const stateWithListings = {
                    ...initialState,
                    recoveryListings: [{ id: 1, status: 'APPROVED' }],
                };
                const action = { type: 'marketplace/processRecoverySale/fulfilled', payload };
                const result = marketplaceReducer(stateWithListings, action);
                expect(result.recoveryListings[0].status).toBe('SOLD');
            });
        });

        describe('cancelRecoveryListing (admin)', () => {
            it('should update listing in recoveryListings on fulfilled', () => {
                const payload = { listing: { id: 1, status: 'CANCELLED' } };
                const stateWithListings = {
                    ...initialState,
                    recoveryListings: [{ id: 1, status: 'PENDING' }],
                };
                const action = { type: 'marketplace/cancelRecoveryListing/fulfilled', payload };
                const result = marketplaceReducer(stateWithListings, action);
                expect(result.recoveryListings[0].status).toBe('CANCELLED');
            });
        });
    });
});
