import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document as DocumentType } from '../../types';
import { getDocuments, uploadDocument, deleteDocument } from '../../services/api';
import Spinner from '../ui/Spinner';

const FileIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
);
const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 6l1-4h12l1 4"/></svg>
);
const CloudUploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
);

interface DocumentManagerProps {
  houseId: string;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ houseId }) => {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await getDocuments(houseId);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [houseId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };
  
  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
        await uploadDocument(houseId, file);
        await fetchDocuments();
    } catch(err: any) {
        setError(err.message);
    } finally {
        setUploading(false);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  const handleDelete = async (fileName: string) => {
    if (window.confirm(`Are you sure you want to delete ${fileName}? This action cannot be undone.`)) {
      try {
        await deleteDocument(houseId, fileName);
        setDocuments(prev => prev.filter(doc => doc.name !== fileName));
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(isEntering);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      handleDragEvents(e, false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
          handleUpload(file);
      }
  };
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  return (
    <div className="space-y-4">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
        <div 
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDragOver={(e) => handleDragEvents(e, true)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${isDragging ? 'border-primary bg-primary-light/30' : 'border-neutral-300 dark:border-neutral-600 hover:border-primary/70'}`}
        >
            <CloudUploadIcon className="h-10 w-10 text-neutral-400" />
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                <span className="font-semibold text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">PDF, PNG, JPG, DOCX, etc.</p>
        </div>

        {uploading && <div className="flex items-center gap-2 text-sm text-primary"><Spinner /><span>Uploading...</span></div>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {loading ? <Spinner /> : (
            <div className="space-y-2">
                {documents.length > 0 ? documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-md animate-fade-in">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <FileIcon className="h-6 w-6 text-neutral-500 flex-shrink-0" />
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{doc.name}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatBytes(doc.size)} - Added {new Date(doc.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <a href={doc.publicUrl} target="_blank" rel="noopener noreferrer" title="Download" className="p-2 text-neutral-600 hover:text-primary dark:text-neutral-400 dark:hover:text-primary-light rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700">
                                <DownloadIcon className="h-5 w-5" />
                            </a>
                            <button onClick={() => handleDelete(doc.name)} title="Delete" className="p-2 text-neutral-600 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )) : <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 py-4">No documents uploaded for this tenant.</p>}
            </div>
        )}
    </div>
  );
};

export default DocumentManager;