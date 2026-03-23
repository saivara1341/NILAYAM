import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';

interface ImmersiveViewerProps {
    isOpen: boolean;
    onClose: () => void;
    type: '3d' | '360';
    url: string;
    title: string;
}

/**
 * A viewer for immersive content (3D models and 360° panoramas).
 * Uses Web Components and CDNs to keep the main bundle light.
 */
const ImmersiveViewer: React.FC<ImmersiveViewerProps> = ({ isOpen, onClose, type, url, title }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);

        if (type === '3d') {
            // Load Google Model Viewer if not already loaded
            if (!document.getElementById('model-viewer-script')) {
                const script = document.createElement('script');
                script.id = 'model-viewer-script';
                script.type = 'module';
                script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
                document.head.appendChild(script);
            }
        } else if (type === '360') {
            // Load Pannellum CSS and JS if not already loaded
            if (!document.getElementById('pannellum-script')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
                document.head.appendChild(link);

                const script = document.createElement('script');
                script.id = 'pannellum-script';
                script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
                document.head.appendChild(script);
            }
        }
    }, [isOpen, type]);

    const handleLoad = () => {
        setLoading(false);
    };

    // For 360 we use an effect to initialize pannellum once scripts are loaded
    useEffect(() => {
        if (isOpen && type === '360' && url) {
            const checkPannellum = setInterval(() => {
                if ((window as any).pannellum) {
                    clearInterval(checkPannellum);
                    try {
                        (window as any).pannellum.viewer('panorama-container', {
                            type: 'equirectangular',
                            panorama: url,
                            autoLoad: true,
                            title: title,
                            author: 'Nilayam Property Management',
                        });
                        setLoading(false);
                    } catch (e) {
                        console.error('Pannellum initialization error:', e);
                        setLoading(false);
                    }
                }
            }, 100);
            return () => clearInterval(checkPannellum);
        }
    }, [isOpen, type, url, title]);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title}
            maxWidth="4xl"
        >
            <div className="relative w-full aspect-video md:aspect-[16/9] bg-neutral-900 rounded-2xl overflow-hidden flex items-center justify-center">
                {loading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-900/80 backdrop-blur-sm">
                        <Spinner className="h-12 w-12" />
                        <p className="mt-4 text-sm text-neutral-400 font-medium">Loading immersive view...</p>
                    </div>
                )}

                {type === '3d' ? (
                    <div className="w-full h-full">
                        {/* @ts-ignore */}
                        <model-viewer
                            src={url}
                            alt={title}
                            auto-rotate
                            camera-controls
                            shadow-intensity="1"
                            background-color="#0a0a0a"
                            style={{ width: '100%', height: '100%' }}
                            onLoad={handleLoad}
                        >
                            {/* @ts-ignore */}
                        </model-viewer>
                    </div>
                ) : (
                    <div id="panorama-container" className="w-full h-full bg-black"></div>
                )}

                {/* Help Indicator */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-white font-bold uppercase tracking-wider">
                        {type === '3d' ? '3D Interactive' : '360° Panorama'}
                    </span>
                </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center text-xs text-neutral-500 font-medium px-2">
                <p>Use your mouse or touch to interact and explore.</p>
                <button 
                   onClick={onClose}
                   className="text-blue-500 hover:text-blue-600 font-bold"
                >
                    Close Viewer
                </button>
            </div>
        </Modal>
    );
};

export default ImmersiveViewer;
