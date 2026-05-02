import { useState, useCallback, useEffect } from 'react';
import { Upload, X, FileText, Image, CheckCircle, AlertCircle, Trash2, Eye } from 'lucide-react';
import loanService from '../../services/loanService';

/**
 * CollateralUploader - Collateral upload interface for borrowers
 * 
 * @param {Object} props
 * @param {Function} props.onUpload - Callback when files are uploaded
 * @param {Array} props.initialFiles - Pre-existing files
 * @param {boolean} props.readOnly - Whether uploader is read-only
 */
function CollateralUploader({ onUpload, initialFiles = [], readOnly = false, loanId = null }) {
    const [files, setFiles] = useState(initialFiles);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [error, setError] = useState(null);
    
    // Accepted file types
    const acceptedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    // Max file size (10MB)
    const maxFileSize = 10 * 1024 * 1024;
    
    // Handle file selection
    const handleFiles = useCallback((selectedFiles) => {
        setError(null);
        const validFiles = [];
        
        Array.from(selectedFiles).forEach(file => {
            // Check file type
            if (!acceptedTypes.includes(file.type)) {
                setError(`Invalid file type: ${file.name}. Please upload images or documents.`);
                return;
            }
            
            // Check file size
            if (file.size > maxFileSize) {
                setError(`File too large: ${file.name}. Maximum size is 10MB.`);
                return;
            }
            
            validFiles.push({
                id: Math.random().toString(36).substr(2, 9),
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
                uploadedAt: new Date(),
                status: 'pending',
            });
        });
        
        if (validFiles.length > 0) {
            const newFiles = [...files, ...validFiles];
            setFiles(newFiles);
            if (onUpload) {
                onUpload(newFiles);
            }
        }
    }, [files, onUpload]);
    
    // Handle drag events
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    
    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);
    
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = e.dataTransfer.files;
        handleFiles(droppedFiles);
    }, [handleFiles]);
    
    // Remove file
    const removeFile = useCallback((fileId) => {
        const newFiles = files.filter(f => f.id !== fileId);
        setFiles(newFiles);
        if (onUpload) {
            onUpload(newFiles);
        }
    }, [files, onUpload]);
    
    // Upload files to server
    const uploadFiles = useCallback(async (filesToUpload) => {
        if (!loanId) {
            setError('Loan ID is required for file upload');
            setUploading(false);
            return;
        }
        
        setUploading(true);
        setError(null);
        
        try {
            // Upload each file individually
            const uploadedFiles = [];
            
            for (const file of filesToUpload) {
                setUploadProgress(prev => ({ ...prev, [file.id]: 0 }));
                
                const formData = new FormData();
                formData.append('file', file.file);
                formData.append('fileName', file.name);
                formData.append('fileType', file.type);
                
                try {
                    const response = await loanService.uploadCollateral(loanId, formData);
                    
                    setUploadProgress(prev => ({ ...prev, [file.id]: 100 }));
                    
                    uploadedFiles.push({
                        ...file,
                        status: 'uploaded',
                        url: response.url || response.fileUrl || `/uploads/collateral/${response.id}`,
                        serverId: response.id || response.collateralId,
                    });
                } catch (uploadError) {
                    console.error(`Failed to upload ${file.name}:`, uploadError);
                    // Mark as failed but continue with other files
                    uploadedFiles.push({
                        ...file,
                        status: 'failed',
                        error: uploadError.message || 'Upload failed'
                    });
                }
            }
            
            // Update files state with uploaded status
            const allFiles = files.map(f => {
                const uploaded = uploadedFiles.find(uf => uf.id === f.id);
                return uploaded || f;
            });
            
            setFiles(allFiles);
            setUploading(false);
            
            if (onUpload) {
                onUpload(allFiles);
            }
            
            // Check if any files failed
            const failedCount = uploadedFiles.filter(f => f.status === 'failed').length;
            if (failedCount > 0) {
                setError(`${failedCount} file(s) failed to upload. Please try again.`);
            }
            
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload files. Please try again.');
            setUploading(false);
        }
    }, [loanId, onUpload, files]);
    
    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };
    
    // Get file icon
    const getFileIcon = (type) => {
        if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
        return <FileText className="w-5 h-5" />;
    };
    
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary-500" />
                Collateral Documents
            </h3>
            
            {/* Upload Area */}
            {!readOnly && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging 
                            ? 'border-primary-500 bg-primary-50' 
                            : 'border-slate-300 hover:border-primary-400'
                    }`}
                >
                    <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-primary-500' : 'text-slate-400'}`} />
                    <p className="text-slate-600 mb-2">
                        Drag and drop files here, or click to select
                    </p>
                    <p className="text-sm text-slate-400">
                        Supports: JPEG, PNG, PDF, DOC (max 10MB)
                    </p>
                    <input
                        type="file"
                        multiple
                        accept={acceptedTypes.join(',')}
                        onChange={(e) => handleFiles(e.target.files)}
                        className="hidden"
                        id="collateral-upload"
                    />
                    <label
                        htmlFor="collateral-upload"
                        className="mt-4 inline-block px-4 py-2 bg-primary-500 text-white rounded-lg cursor-pointer hover:bg-primary-600 transition-colors"
                    >
                        Select Files
                    </label>
                </div>
            )}
            
            {/* Error Message */}
            {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-red-700">{error}</span>
                </div>
            )}
            
            {/* File List */}
            {files.length > 0 && (
                <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">
                        Uploaded Files ({files.length})
                    </h4>
                    
                    {files.map(file => (
                        <div 
                            key={file.id}
                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                        >
                            {/* Preview */}
                            {file.preview ? (
                                <div className="w-12 h-12 rounded overflow-hidden bg-slate-200 flex-shrink-0">
                                    <img 
                                        src={file.preview} 
                                        alt={file.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center flex-shrink-0 text-slate-500">
                                    {getFileIcon(file.type)}
                                </div>
                            )}
                            
                            {/* File Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                    {file.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {formatFileSize(file.size)}
                                </p>
                            </div>
                            
                            {/* Status */}
                            <div className="flex items-center gap-2">
                                {file.status === 'uploaded' ? (
                                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                                        <CheckCircle className="w-4 h-4" />
                                        Uploaded
                                    </span>
                                ) : file.status === 'failed' ? (
                                    <span className="flex items-center gap-1 text-xs text-red-600">
                                        <AlertCircle className="w-4 h-4" />
                                        Failed
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs text-amber-600">
                                        <AlertCircle className="w-4 h-4" />
                                        Pending
                                    </span>
                                )}
                            </div>
                            
                            {/* Actions */}
                            {!readOnly && (
                                <div className="flex items-center gap-1">
                                    {file.preview && (
                                        <button
                                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                                            title="Preview"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => removeFile(file.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {/* Upload Button */}
            {files.length > 0 && !readOnly && !uploading && (
                <button
                    onClick={() => uploadFiles(files.filter(f => f.status !== 'uploaded'))}
                    disabled={!loanId}
                    className={`mt-4 w-full py-3 rounded-lg transition-colors ${
                        loanId 
                            ? 'bg-primary-500 text-white hover:bg-primary-600' 
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                >
                    {loanId ? 'Upload All Documents' : 'Save Loan to Enable Upload'}
                </button>
            )}
            
            {/* Uploading State */}
            {uploading && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-blue-700">Uploading documents...</span>
                    </div>
                    {/* Individual file progress */}
                    <div className="space-y-2">
                        {files.filter(f => f.status !== 'uploaded').map(file => (
                            <div key={file.id} className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-blue-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 transition-all duration-300"
                                        style={{ width: `${uploadProgress[file.id] || 0}%` }}
                                    />
                                </div>
                                <span className="text-xs text-blue-600 w-8">{uploadProgress[file.id] || 0}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Help Text */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">
                    <strong>Tip:</strong> Upload clear photos of your collateral and any valuation reports. 
                    Accepted documents include property deeds, vehicle registration, equipment invoices, 
                    or professional valuation reports.
                </p>
            </div>
        </div>
    );
}

export default CollateralUploader;
