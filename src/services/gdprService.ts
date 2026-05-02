import { createApiClient } from '../utils/api/client';
import type { GDPRConsent, GDPRDataRequest, GDPRConsentType, ApiResponse } from '../types';

const API_URL = '/api/gdpr';

// Create GDPR-specific API client
const api = createApiClient(API_URL);

const gdprService = {
  /**
   * Get all GDPR consents for the current user
   */
  getConsents: async (): Promise<ApiResponse<GDPRConsent[]>> => {
    const response = await api.get('/consents');
    return response.data;
  },

  /**
   * Grant a specific consent
   */
  grantConsent: async (consentType: GDPRConsentType): Promise<ApiResponse<GDPRConsent>> => {
    const response = await api.post('/consents', {
      consentType,
      granted: true,
    });
    return response.data;
  },

  /**
   * Withdraw a specific consent
   */
  withdrawConsent: async (consentType: GDPRConsentType): Promise<ApiResponse<GDPRConsent>> => {
    const response = await api.put('/consents', {
      consentType,
      granted: false,
    });
    return response.data;
  },

  /**
   * Grant all required consents (for registration)
   */
  grantAllRequiredConsents: async (consents: GDPRConsentType[]): Promise<ApiResponse<GDPRConsent[]>> => {
    const response = await api.post('/consents/bulk', {
      consents: consents.map(type => ({
        consentType: type,
        granted: true,
      })),
    });
    return response.data;
  },

  /**
   * Check if all required consents are granted
   */
  checkRequiredConsents: async (): Promise<ApiResponse<{
    allGranted: boolean;
    missing: GDPRConsentType[];
  }>> => {
    const response = await api.get('/consents/check');
    return response.data;
  },

  /**
   * Request data export (Right to Access - Article 15)
   */
  requestDataExport: async (): Promise<ApiResponse<GDPRDataRequest>> => {
    const response = await api.post('/data-export');
    return response.data;
  },

  /**
   * Get status of data export request
   */
  getDataExportStatus: async (requestId: string): Promise<ApiResponse<GDPRDataRequest>> => {
    const response = await api.get(`/data-export/${requestId}`);
    return response.data;
  },

  /**
   * Download exported data
   */
  downloadExportedData: async (requestId: string): Promise<Blob> => {
    const response = await api.get(`/data-export/${requestId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Request data deletion (Right to Erasure - Article 17)
   */
  requestDataDeletion: async (reason?: string): Promise<ApiResponse<GDPRDataRequest>> => {
    const response = await api.post('/data-deletion', { reason });
    return response.data;
  },

  /**
   * Get status of data deletion request
   */
  getDataDeletionStatus: async (requestId: string): Promise<ApiResponse<GDPRDataRequest>> => {
    const response = await api.get(`/data-deletion/${requestId}`);
    return response.data;
  },

  /**
   * Cancel data deletion request (if still pending)
   */
  cancelDataDeletion: async (requestId: string): Promise<ApiResponse<{ success: boolean }>> => {
    const response = await api.post(`/data-deletion/${requestId}/cancel`);
    return response.data;
  },

  /**
   * Request data rectification (Right to Rectification - Article 16)
   */
  requestDataRectification: async (data: Record<string, unknown>): Promise<ApiResponse<GDPRDataRequest>> => {
    const response = await api.post('/data-rectification', data);
    return response.data;
  },

  /**
   * Get all GDPR data requests
   */
  getDataRequests: async (): Promise<ApiResponse<GDPRDataRequest[]>> => {
    const response = await api.get('/requests');
    return response.data;
  },

  /**
   * Get GDPR policy version
   */
  getPolicyVersion: async (): Promise<ApiResponse<{ version: string; updatedAt: string }>> => {
    const response = await api.get('/policy-version');
    return response.data;
  },

  /**
   * Accept new privacy policy version
   */
  acceptPolicyVersion: async (version: string): Promise<ApiResponse<{ success: boolean }>> => {
    const response = await api.post('/accept-policy', { version });
    return response.data;
  },
};

export default gdprService;

// Export consent types for easy access
export const CONSENT_TYPES = {
  TERMS_OF_SERVICE: 'terms_of_service' as GDPRConsentType,
  PRIVACY_POLICY: 'privacy_policy' as GDPRConsentType,
  MARKETING_EMAILS: 'marketing_emails' as GDPRConsentType,
  DATA_PROCESSING: 'data_processing' as GDPRConsentType,
  THIRD_PARTY_SHARING: 'third_party_sharing' as GDPRConsentType,
  COOKIES: 'cookies' as GDPRConsentType,
};

// Required consents for registration
export const REQUIRED_CONSENTS: GDPRConsentType[] = [
  CONSENT_TYPES.TERMS_OF_SERVICE,
  CONSENT_TYPES.PRIVACY_POLICY,
  CONSENT_TYPES.DATA_PROCESSING,
];
