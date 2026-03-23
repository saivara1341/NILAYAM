

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquareIcon } from '../../constants';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

interface Message {
    role: 'user' | 'model';
    text: string;
}

const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const SupportBot: React.FC = () => {
    const { profile, effectiveRole } = useAuth();
    const {
        dashboardSummary,
        financialData,
        occupancyData,
        tenantDashboardData,
        refreshDashboard,
        refreshTenantDashboard
    } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'Greetings. I am the Nilayam Neural Assistant. I can help based on your current owner or tenant data inside Nilayam. How may I help today?' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Draggable state
    const [position, setPosition] = useState({ x: -1, y: -1 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const hasDragged = useRef(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (effectiveRole === 'owner' && !dashboardSummary) {
            void refreshDashboard();
        }
        if (effectiveRole === 'tenant' && !tenantDashboardData) {
            void refreshTenantDashboard();
        }
    }, [isOpen, effectiveRole, dashboardSummary, tenantDashboardData, refreshDashboard, refreshTenantDashboard]);

    const assistantContext = useMemo(() => {
        if (effectiveRole === 'tenant') {
            return {
                role: 'tenant',
                profile: {
                    full_name: profile?.full_name,
                    subscription_tier: profile?.subscription_tier
                },
                tenantDashboard: tenantDashboardData ? {
                    tenancyDetails: tenantDashboardData.tenancyDetails,
                    nextPayment: tenantDashboardData.nextPayment,
                    maintenanceCount: tenantDashboardData.openMaintenanceRequests.length,
                    remindersCount: tenantDashboardData.reminders.length,
                    agreementStatus: tenantDashboardData.agreement?.status || null,
                    advanceAmount: tenantDashboardData.lifecycle?.advance_amount || 0
                } : null
            };
        }

        return {
            role: effectiveRole || 'guest',
            profile: {
                full_name: profile?.full_name,
                subscription_tier: profile?.subscription_tier
            },
            ownerDashboard: dashboardSummary ? {
                summary: dashboardSummary,
                financialData: financialData.slice(-6),
                occupancyData
            } : null
        };
    }, [effectiveRole, profile, tenantDashboardData, dashboardSummary, financialData, occupancyData]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging.current) return;
            hasDragged.current = true;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            setPosition({
                x: clientX - dragOffset.current.x,
                y: clientY - dragOffset.current.y
            });
        };

        const handleMouseUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
                setTimeout(() => { hasDragged.current = false; }, 100);
            }
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: false });
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, []);

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        isDragging.current = true;
        hasDragged.current = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        let targetElement = e.currentTarget as HTMLElement;
        const rect = targetElement.getBoundingClientRect();
        
        dragOffset.current = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
        
        if (position.x === -1) {
            setPosition({ x: rect.left, y: rect.top });
        }
    };

    const handleClick = () => {
        if (!hasDragged.current) {
            setIsOpen(!isOpen);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
            if (!apiKey) throw new Error("API Key not set");
            const ai = new GoogleGenAI({ apiKey });
            
            // System context for the bot
            const systemPrompt = `You are the advanced AI Assistant for "Nilayam", a premium, cloud-native property management system.
            
            **Operational Parameters:**
            1. **Identity**: You are professional, precise, and helpful. You act as a highly capable operational partner.
            2. **System Status**: Use the provided live in-app context for the signed-in user. Never invent portfolio or tenant details that are not present in the supplied context.
            3. **Capabilities**:
               - You help manage Properties, Tenants, Financials, and Community features.
               - You can draft legal documents (leases) and notices using the built-in tools on the respective pages.
               - If the user is an owner, speak from owner portfolio and operations context.
               - If the user is a tenant, speak from tenant residence, payment, maintenance, agreement, and reminder context.
            
            **Knowledge Base:**
            - You are an expert in Real Estate operations and Indian RERA regulations.
            - You focus on efficiency and clarity.
            
            **Task:** Answer the user's query concisely. If they ask to perform an action (like "add tenant" or "draft lease"), guide them to the specific section of the app where that tool resides.

            **Signed-in User Context**
            ${JSON.stringify(assistantContext, null, 2)}`;

            // Fix: Use gemini-3-flash-preview for chat assistant tasks
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt + "\n\nUser Query: " + userMsg }] }
                ]
            });

            setMessages(prev => [...prev, { role: 'model', text: response.text }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: "Connection interrupted. Please check your network or API configuration." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onMouseDown={handlePointerDown}
                onTouchStart={handlePointerDown}
                onClick={handleClick}
                style={{
                    left: position.x !== -1 ? `${position.x}px` : undefined,
                    top: position.y !== -1 ? `${position.y}px` : undefined,
                    right: position.x === -1 ? '1.5rem' : 'auto',
                    bottom: position.y === -1 ? '6rem' : 'auto'
                }}
                className={`fixed p-4 rounded-full shadow-2xl transition-transform duration-300 z-50 flex items-center justify-center cursor-move touch-none ${isOpen ? 'bg-neutral-800 rotate-90' : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'}`}
            >
                {isOpen ? <CloseIcon className="w-6 h-6 text-white" /> : <MessageSquareIcon className="w-6 h-6 text-white" />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col z-50 animate-fade-in overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <span className="text-lg">🤖</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Nilayam Intelligence</h3>
                                <p className="text-blue-200 text-[10px] uppercase tracking-wider">{effectiveRole === 'tenant' ? 'Tenant Assistant' : effectiveRole === 'owner' ? 'Owner Assistant' : 'System Online'}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                            aria-label="Close chatbot"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-neutral-950">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-bl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                             <div className="flex justify-start">
                                <div className="bg-white dark:bg-neutral-800 p-3 rounded-2xl rounded-bl-none border border-neutral-200 dark:border-neutral-700 shadow-sm">
                                    <div className="flex space-x-1">
                                        <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                                        <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                        <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Type your request..."
                            className="flex-1 px-4 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isTyping}
                            className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 disabled:bg-neutral-400 transition-colors"
                        >
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default SupportBot;
