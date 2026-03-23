import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { getTenantMaintenanceRequests, createTenantMaintenanceRequest } from '../services/api';
import { MaintenanceRequest, MaintenanceStatus } from '../types';
import { CloudUploadIcon, CameraIcon, MicIcon } from '../constants';

const statusStyles: { [key in MaintenanceStatus]: string } = {
    open: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    closed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const AddRequestModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; }> = ({ isOpen, onClose, onSuccess }) => {
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await createTenantMaintenanceRequest(description, files);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setDescription('');
            setFiles([]);
            setError(null);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Maintenance Request">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="description" className="block text-sm font-bold text-blue-900 dark:text-blue-200">Issue Description</label>
                        <button type="button" className="flex items-center gap-1.5 text-xs font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-full shadow-sm border border-blue-100 dark:border-blue-900 hover:scale-105 transition-transform">
                            <MicIcon className="w-3.5 h-3.5" /> VOICE RECORD
                        </button>
                    </div>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-blue-300 dark:placeholder:text-blue-800 resize-none"
                        placeholder="Tell us what needs fixing..."
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <CameraIcon className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-black text-slate-500 group-hover:text-blue-600 uppercase tracking-tighter">Add Photos</span>
                    </button>
                    
                    <div className={`flex flex-col items-center justify-center p-6 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 ${files.length > 0 ? 'border-green-500 bg-green-50/20' : ''}`}>
                         {files.length > 0 ? (
                             <>
                                <div className="text-2xl font-black text-green-600">{files.length}</div>
                                <span className="text-[10px] font-black text-green-600 uppercase">Selected</span>
                             </>
                         ) : (
                             <>
                                <CloudUploadIcon className="h-6 w-6 text-slate-300" />
                                <span className="text-[10px] font-black text-slate-400 uppercase">No Files</span>
                             </>
                         )}
                    </div>
                </div>

                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />

                {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-neutral-800 rounded-xl hover:bg-slate-200 uppercase tracking-widest transition-all">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-[2] bg-blue-600 text-white py-3.5 rounded-xl text-xs font-black hover:bg-blue-700 disabled:bg-slate-300 shadow-lg shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest">
                        {loading ? 'Processing...' : 'Submit Request'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const TenantMaintenancePage: React.FC = () => {
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getTenantMaintenanceRequests();
            setRequests(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const renderContent = () => {
        if (loading) return <div className="text-center py-12"><Spinner /></div>;
        if (error) return <div className="text-center py-12 text-red-500 bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">Error: {error}</div>;
        if (requests.length === 0) {
            return (
                <div className="text-center py-12">
                    <p className="text-slate-500 dark:text-slate-400">You have no maintenance requests.</p>
                </div>
            );
        }
        return (
            <div className="space-y-4">
                {requests.map(req => (
                    <Card key={req.id}>
                        <div className="flex justify-between items-start">
                             <p className="text-sm text-slate-500 dark:text-slate-400">{req.description}</p>
                             <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[req.status]}`}>{req.status.replace('_', ' ').toUpperCase()}</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                            Reported on: {new Date(req.created_at).toLocaleDateString()}
                        </p>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <>
            <AddRequestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchRequests} />
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-wrap gap-4 justify-between items-center">
                    <h2 className="text-3xl font-bold text-blue-900 dark:text-slate-200">My Maintenance</h2>
                    <button onClick={() => setIsModalOpen(true)} className="bg-blue-800 dark:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-900 dark:hover:bg-blue-700 transition-colors">
                        New Request
                    </button>
                </div>
                <Card>
                    <div className="p-4">
                        {renderContent()}
                    </div>
                </Card>
            </div>
            <style>{`.form-input { display: block; width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; background-color: white; color: #0f172a; } .dark .form-input { border-color: #475569; background-color: #334155; color: #f1f5f9; }`}</style>
        </>
    );
};

export default TenantMaintenancePage;
