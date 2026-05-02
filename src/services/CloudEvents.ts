/**
 * CloudEvents Schema for LENDA Platform
 * 
 * Implements CloudEvents specification for standardized event communication
 * https://cloudevents.io/
 */

import { EventTypes } from './EventBus';

/**
 * CloudEvents Event Format
 * https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md
 */
export interface CloudEvent<T = unknown> {
    // Required fields
    id: string;
    source: string;
    type: string;
    specversion: string;
    
    // Optional fields
    datacontenttype?: string;
    dataschema?: string;
    subject?: string;
    time?: string;
    data?: T;
    
    // Extension fields
    [key: string]: unknown;
}

/**
 * CloudEvents spec version
 */
export const CLOUDEVENTS_VERSION = '1.0';

/**
 * Event sources for LENDA platform
 */
export const EventSources = {
    LOAN_SERVICE: '/services/loan',
    WALLET_SERVICE: '/services/wallet',
    ESCROW_SERVICE: '/services/escrow',
    COLLATERAL_SERVICE: '/services/collateral',
    BLOCKCHAIN_SERVICE: '/services/blockchain',
    DISCOVERY_SERVICE: '/services/discovery',
    ADMIN_SERVICE: '/services/admin',
    MARKETPLACE_SERVICE: '/services/marketplace',
    USER_SERVICE: '/services/user',
    SYSTEM: '/system'
} as const;

/**
 * Event type prefixes
 */
export const EventTypePrefixes = {
    LOAN: 'lenda.loan',
    WALLET: 'lenda.wallet',
    ESCROW: 'lenda.escrow',
    COLLATERAL: 'lenda.collateral',
    BLOCKCHAIN: 'lenda.blockchain',
    USER: 'lenda.user',
    ADMIN: 'lenda.admin',
    MARKET: 'lenda.market',
    SYSTEM: 'lenda.system'
} as const;

/**
 * Map internal EventTypes to CloudEvents format
 */
export const EventTypeMapping: Record<string, string> = {
    // Loan events
    [EventTypes.LOAN_CREATED]: `${EventTypePrefixes.LOAN}.created`,
    [EventTypes.LOAN_FUNDED]: `${EventTypePrefixes.LOAN}.funded`,
    [EventTypes.LOAN_APPROVED]: `${EventTypePrefixes.LOAN}.approved`,
    [EventTypes.LOAN_REJECTED]: `${EventTypePrefixes.LOAN}.rejected`,
    [EventTypes.LOAN_REPAID]: `${EventTypePrefixes.LOAN}.repaid`,
    [EventTypes.LOAN_DEFAULTED]: `${EventTypePrefixes.LOAN}.defaulted`,
    [EventTypes.LOAN_CANCELLED]: `${EventTypePrefixes.LOAN}.cancelled`,
    
    // Funding events
    [EventTypes.FUNDING_CREATED]: `${EventTypePrefixes.LOAN}.funding.created`,
    [EventTypes.FUNDING_CONFIRMED]: `${EventTypePrefixes.LOAN}.funding.confirmed`,
    
    // Wallet events
    [EventTypes.WALLET_BALANCE_UPDATED]: `${EventTypePrefixes.WALLET}.balance.updated`,
    [EventTypes.WALLET_DEPOSIT]: `${EventTypePrefixes.WALLET}.deposit`,
    [EventTypes.WALLET_WITHDRAWAL]: `${EventTypePrefixes.WALLET}.withdrawal`,
    [EventTypes.WALLET_TRANSFER]: `${EventTypePrefixes.WALLET}.transfer`,
    
    // Collateral events
    [EventTypes.COLLATERAL_UPLOADED]: `${EventTypePrefixes.COLLATERAL}.uploaded`,
    [EventTypes.COLLATERAL_VERIFIED]: `${EventTypePrefixes.COLLATERAL}.verified`,
    [EventTypes.COLLATERAL_REJECTED]: `${EventTypePrefixes.COLLATERAL}.rejected`,
    [EventTypes.COLLATERAL_RELEASED]: `${EventTypePrefixes.COLLATERAL}.released`,
    
    // Escrow events
    [EventTypes.ESCROW_CREATED]: `${EventTypePrefixes.ESCROW}.created`,
    [EventTypes.ESCROW_FUNDED]: `${EventTypePrefixes.ESCROW}.funded`,
    [EventTypes.ESCROW_SHIPPED]: `${EventTypePrefixes.ESCROW}.shipped`,
    [EventTypes.ESCROW_DELIVERED]: `${EventTypePrefixes.ESCROW}.delivered`,
    [EventTypes.ESCROW_RELEASED]: `${EventTypePrefixes.ESCROW}.released`,
    [EventTypes.ESCROW_DISPUTED]: `${EventTypePrefixes.ESCROW}.disputed`,
    [EventTypes.ESCROW_RESOLVED]: `${EventTypePrefixes.ESCROW}.resolved`,
    
    // Blockchain events
    [EventTypes.BLOCKCHAIN_SYNC_START]: `${EventTypePrefixes.BLOCKCHAIN}.sync.start`,
    [EventTypes.BLOCKCHAIN_SYNC_COMPLETE]: `${EventTypePrefixes.BLOCKCHAIN}.sync.complete`,
    [EventTypes.BLOCKCHAIN_SYNC_ERROR]: `${EventTypePrefixes.BLOCKCHAIN}.sync.error`,
    [EventTypes.BLOCKCHAIN_EVENT_RECEIVED]: `${EventTypePrefixes.BLOCKCHAIN}.event.received`,
    
    // User events
    [EventTypes.USER_LOGGED_IN]: `${EventTypePrefixes.USER}.logged.in`,
    [EventTypes.USER_LOGGED_OUT]: `${EventTypePrefixes.USER}.logged.out`,
    [EventTypes.USER_PROFILE_UPDATED]: `${EventTypePrefixes.USER}.profile.updated`,
    [EventTypes.USER_KYC_UPDATED]: `${EventTypePrefixes.USER}.kyc.updated`,
    
    // System events
    [EventTypes.NOTIFICATION]: `${EventTypePrefixes.SYSTEM}.notification`,
    [EventTypes.ERROR]: `${EventTypePrefixes.SYSTEM}.error`,
    [EventTypes.MAINTENANCE_MODE]: `${EventTypePrefixes.SYSTEM}.maintenance`,
    [EventTypes.RATE_LIMIT_EXCEEDED]: `${EventTypePrefixes.SYSTEM}.rate.limit.exceeded`,
    
    // Admin events
    [EventTypes.ADMIN_LOAN_APPROVED]: `${EventTypePrefixes.ADMIN}.loan.approved`,
    [EventTypes.ADMIN_LOAN_REJECTED]: `${EventTypePrefixes.ADMIN}.loan.rejected`,
    [EventTypes.ADMIN_COLLATERAL_VERIFIED]: `${EventTypePrefixes.ADMIN}.collateral.verified`,
    [EventTypes.ADMIN_DEFAULT_INITIATED]: `${EventTypePrefixes.ADMIN}.default.initiated`,
    
    // Market events
    [EventTypes.MARKET_STATS_UPDATED]: `${EventTypePrefixes.MARKET}.stats.updated`,
    [EventTypes.INTEREST_RATE_CHANGED]: `${EventTypePrefixes.MARKET}.interest.rate.changed`
};

/**
 * Create a CloudEvent from internal event data
 */
export function createCloudEvent<T = unknown>(
    eventType: string,
    data: T,
    options: {
        source?: string;
        subject?: string;
        datacontenttype?: string;
        id?: string;
        time?: string;
    } = {}
): CloudEvent<T> {
    const {
        source = EventSources.SYSTEM,
        subject,
        datacontenttype = 'application/json',
        id = generateEventId(),
        time = new Date().toISOString()
    } = options;

    return {
        id,
        source,
        type: EventTypeMapping[eventType] || eventType,
        specversion: CLOUDEVENTS_VERSION,
        datacontenttype,
        time,
        subject,
        data
    };
}

/**
 * Generate unique event ID
 */
export function generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * CloudEvent extensions for additional metadata
 */
export interface CloudEventExtensions {
    // User context
    userId?: string;
    userRole?: string;
    
    // Request context
    correlationId?: string;
    causationId?: string;
    
    // Platform context
    platformVersion?: string;
    environment?: string;
    
    // Additional
    [key: string]: unknown;
}

/**
 * Add extensions to a CloudEvent
 */
export function addExtensions<T>(
    event: CloudEvent<T>,
    extensions: CloudEventExtensions
): CloudEvent<T> {
    return {
        ...event,
        ...extensions
    };
}

/**
 * Serialize CloudEvent to JSON
 */
export function serializeCloudEvent<T>(event: CloudEvent<T>): string {
    return JSON.stringify(event);
}

/**
 * Deserialize CloudEvent from JSON
 */
export function deserializeCloudEvent<T>(json: string): CloudEvent<T> {
    return JSON.parse(json);
}

/**
 * Validate CloudEvent structure
 */
export function validateCloudEvent(event: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!event || typeof event !== 'object') {
        return { valid: false, errors: ['Event must be an object'] };
    }
    
    const e = event as Record<string, unknown>;
    
    if (!e.id || typeof e.id !== 'string') {
        errors.push('Missing or invalid required field: id');
    }
    
    if (!e.source || typeof e.source !== 'string') {
        errors.push('Missing or invalid required field: source');
    }
    
    if (!e.type || typeof e.type !== 'string') {
        errors.push('Missing or invalid required field: type');
    }
    
    if (!e.specversion || typeof e.specversion !== 'string') {
        errors.push('Missing or invalid required field: specversion');
    }
    
    return { valid: errors.length === 0, errors };
}

export default {
    CLOUDEVENTS_VERSION,
    EventSources,
    EventTypePrefixes,
    createCloudEvent,
    generateEventId,
    serializeCloudEvent,
    deserializeCloudEvent,
    validateCloudEvent
};
