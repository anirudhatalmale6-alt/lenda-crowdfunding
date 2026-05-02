import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Shield, 
  Download, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  Clock,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getConsents,
  grantConsent,
  withdrawConsent,
  requestDataExport,
  requestDataDeletion,
  getDataRequests,
  checkRequiredConsents,
} from '../store/slices/gdprSlice';
import { CONSENT_TYPES, REQUIRED_CONSENTS } from '../services/gdprService';

const consentLabels = {
  [CONSENT_TYPES.TERMS_OF_SERVICE]: {
    title: 'Terms of Service',
    description: 'I agree to the Terms of Service governing the use of the LENDA platform.',
    required: true,
  },
  [CONSENT_TYPES.PRIVACY_POLICY]: {
    title: 'Privacy Policy',
    description: 'I have read and agree to the Privacy Policy describing how my data is processed.',
    required: true,
  },
  [CONSENT_TYPES.MARKETING_EMAILS]: {
    title: 'Marketing Communications',
    description: 'I want to receive promotional emails about new features and offers.',
    required: false,
  },
  [CONSENT_TYPES.DATA_PROCESSING]: {
    title: 'Data Processing',
    description: 'I consent to the processing of my personal data for providing lending services.',
    required: true,
  },
  [CONSENT_TYPES.THIRD_PARTY_SHARING]: {
    title: 'Third-Party Sharing',
    description: 'I allow sharing my data with trusted partners for credit assessment.',
    required: false,
  },
  [CONSENT_TYPES.COOKIES]: {
    title: 'Cookie Usage',
    description: 'I agree to the use of cookies for analytics and personalization.',
    required: false,
  },
};

export default function GDPRSettings() {
  const dispatch = useDispatch();
  const { 
    consents, 
    dataRequests, 
    isLoading, 
    error, 
    allRequiredConsentsGranted,
    pendingExportRequest,
    pendingDeletionRequest,
  } = useSelector((state) => state.gdpr);
  
  const [deletionReason, setDeletionReason] = useState('');
  const [showDeletionModal, setShowDeletionModal] = useState(false);

  useEffect(() => {
    dispatch(getConsents());
    dispatch(getDataRequests());
    dispatch(checkRequiredConsents());
  }, [dispatch]);

  const handleGrantConsent = async (consentType) => {
    try {
      await dispatch(grantConsent(consentType)).unwrap();
      toast.success('Consent granted successfully');
    } catch (err) {
      toast.error(err || 'Failed to grant consent');
    }
  };

  const handleWithdrawConsent = async (consentType) => {
    try {
      await dispatch(withdrawConsent(consentType)).unwrap();
      toast.success('Consent withdrawn successfully');
    } catch (err) {
      toast.error(err || 'Failed to withdraw consent');
    }
  };

  const handleRequestExport = async () => {
    try {
      await dispatch(requestDataExport()).unwrap();
      toast.success('Data export request submitted. You will be notified when ready.');
    } catch (err) {
      toast.error(err || 'Failed to request data export');
    }
  };

  const handleRequestDeletion = async () => {
    try {
      await dispatch(requestDataDeletion(deletionReason)).unwrap();
      toast.success('Data deletion request submitted');
      setShowDeletionModal(false);
      setDeletionReason('');
    } catch (err) {
      toast.error(err || 'Failed to request data deletion');
    }
  };

  const getConsentStatus = (consentType) => {
    const consent = consents.find(c => c.consentType === consentType);
    return consent?.granted || false;
  };

  const getRequestStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      REJECTED: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Privacy & Data Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your data preferences and exercise your GDPR rights
        </p>
      </div>

      {/* Required Consents Warning */}
      {!allRequiredConsentsGranted && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">Action Required</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Please review and accept the required consents to use the platform.
            </p>
          </div>
        </div>
      )}

      {/* Consent Management */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Consent Preferences</h2>
        <div className="space-y-4">
          {Object.entries(consentLabels).map(([type, label]) => {
            const isGranted = getConsentStatus(type);
            const isRequired = label.required;
            
            return (
              <div 
                key={type} 
                className={`p-4 border rounded-lg ${isGranted ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{label.title}</h3>
                      {isRequired && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{label.description}</p>
                  </div>
                  <div className="ml-4">
                    {isGranted ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        {!isRequired && (
                          <button
                            onClick={() => handleWithdrawConsent(type)}
                            className="text-sm text-red-600 hover:text-red-700"
                            disabled={isLoading}
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-gray-400" />
                        <button
                          onClick={() => handleGrantConsent(type)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                          disabled={isLoading}
                        >
                          Grant
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Data Export */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Data (Right to Access)</h2>
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Export Your Data</h3>
                <p className="text-sm text-gray-600">
                  Download a copy of all your data stored on our platform
                </p>
              </div>
            </div>
            <button
              onClick={handleRequestExport}
              disabled={isLoading || pendingExportRequest?.status === 'PENDING'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : pendingExportRequest?.status === 'PENDING' ? (
                'Request Pending'
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Request Export
                </>
              )}
            </button>
          </div>
          
          {pendingExportRequest && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Export requested on {new Date(pendingExportRequest.createdAt).toLocaleDateString()}
                </span>
              </div>
              {getRequestStatusBadge(pendingExportRequest.status)}
            </div>
          )}
        </div>
      </section>

      {/* Data Deletion */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Delete Your Data (Right to Erasure)</h2>
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Delete Your Account</h3>
                <p className="text-sm text-gray-600">
                  Permanently delete your account and all associated data
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDeletionModal(true)}
              disabled={isLoading || pendingDeletionRequest?.status === 'PENDING'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {pendingDeletionRequest?.status === 'PENDING' ? (
                'Deletion Pending'
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Request Deletion
                </>
              )}
            </button>
          </div>
          
          {pendingDeletionRequest && (
            <div className="mt-4 p-3 bg-white rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Deletion requested on {new Date(pendingDeletionRequest.createdAt).toLocaleDateString()}
                </span>
              </div>
              {getRequestStatusBadge(pendingDeletionRequest.status)}
            </div>
          )}

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Account deletion is irreversible. Active loans must be settled 
              before deletion can be processed. This process may take up to 30 days.
            </p>
          </div>
        </div>
      </section>

      {/* Data Request History */}
      {dataRequests.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Request History</h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dataRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {request.requestType === 'EXPORT' ? 'Data Export' : 
                       request.requestType === 'DELETION' ? 'Data Deletion' : 'Data Rectification'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {getRequestStatusBadge(request.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Deletion Confirmation Modal */}
      {showDeletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Account Deletion</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for deletion (optional)
              </label>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={3}
                placeholder="Please let us know why you're leaving..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeletionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestDeletion}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
