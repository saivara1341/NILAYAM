
import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/ui/Card';
import { getVisitors, createVisitorPass, getAmenities, getActivePolls, createPoll, getAnnouncements, createAnnouncement, getChatMessages, sendCommunityMessage, getProperties, createAmenity, getCommunityMembers } from '../services/api';
import { Visitor, Amenity, Poll, Announcement, ChatMessage, CommunityFeatures } from '../types';
import { ShieldCheckIcon, CalendarDaysIcon, UsersIcon, PlusCircleIcon, BuildingIcon, MessageSquareIcon, MegaphoneIcon, ShoppingBagIcon, TagIcon } from '../constants';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserRole } from '../types';
import { GoogleGenAI } from "@google/genai";

const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 12"/></svg>
);

// --- Sub-Components ---

const CommunityCard: React.FC<{ property: any, onClick: () => void }> = ({ property, onClick }) => (
  <div onClick={onClick} className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-600 dark:text-blue-400">
                <UsersIcon className="w-8 h-8" />
            </div>
            <div>
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{property.name}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">{property.address}</p>
                <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs font-medium px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-full text-neutral-600 dark:text-neutral-300 flex items-center gap-1">
                        <BuildingIcon className="w-3 h-3"/>
                        {property.unit_count || 0} Units
                    </span>
                    {property.community_features?.enable_chat && (
                        <span className="text-xs font-medium px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Chat Active
                        </span>
                    )}
                </div>
            </div>
        </div>
        <div className="text-neutral-300 dark:text-neutral-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors self-center">
            <ChevronRightIcon className="w-6 h-6" />
        </div>
      </div>
  </div>
);

const VisitorCard: React.FC<{ visitor: Visitor }> = ({ visitor }) => (
    <div className="flex justify-between items-center p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
        <div>
            <p className="font-bold text-neutral-800 dark:text-neutral-200">{visitor.name}</p>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded">{visitor.type}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Exp: {new Date(visitor.valid_until).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        </div>
        <div className="text-right">
            <div className="text-2xl font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400">{visitor.access_code}</div>
            <span className={`text-[10px] uppercase tracking-wider font-semibold ${visitor.status.toLowerCase() === 'active' ? 'text-green-600' : 'text-neutral-400'}`}>
                {visitor.status}
            </span>
        </div>
    </div>
);

const AmenityCard: React.FC<{ amenity: Amenity }> = ({ amenity }) => (
    <Card className="hover:border-blue-500 transition-colors cursor-pointer group h-full flex flex-col justify-between">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl group-hover:bg-indigo-100 transition-colors">
                <CalendarDaysIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100">{amenity.name}</h4>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Open: {amenity.open_time} - {amenity.close_time}</p>
            </div>
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-neutral-500">Capacity</span>
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{amenity.capacity} People</span>
            </div>
            <button className="w-full py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                Book Slot
            </button>
        </div>
    </Card>
);

const PollCard: React.FC<{ poll: Poll }> = ({ poll }) => (
    <Card>
        <div className="flex justify-between items-start mb-4">
             <h4 className="font-bold text-lg text-neutral-800 dark:text-neutral-200">{poll.question}</h4>
             <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">Active</span>
        </div>
        <div className="space-y-3">
            {poll.options.map(opt => {
                const percentage = Math.round((opt.votes / (poll.total_votes || 1)) * 100) || 0;
                return (
                    <div key={opt.id} className="relative group cursor-pointer">
                        <div className="flex justify-between text-sm mb-1 z-10 relative">
                            <span className="font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-blue-600 transition-colors">{opt.text}</span>
                            <span className="text-neutral-500 dark:text-neutral-400">{percentage}%</span>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>
                )
            })}
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700">
             <p className="text-xs text-neutral-400">Created by {poll.created_by}</p>
             <p className="text-xs font-medium text-neutral-500">{poll.total_votes} votes</p>
        </div>
    </Card>
);

const AnnouncementFeedItem: React.FC<{ announcement: Announcement }> = ({ announcement }) => (
    <div className="p-4 border-b border-neutral-100 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{announcement.title}</h4>
            <span className="text-xs text-neutral-400 whitespace-nowrap ml-2">{new Date(announcement.created_at).toLocaleDateString()}</span>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3 leading-relaxed">{announcement.message}</p>
    </div>
);

// --- Chat Component ---
const CommunityChat: React.FC<{ propertyId: string, propertyName: string }> = ({ propertyId, propertyName }) => {
    const { profile } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [members, setMembers] = useState<{id: string, name: string, role: string}[]>([]);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchMessages = async () => {
            const data = await getChatMessages(propertyId);
            setMessages(data);
        };
        const fetchMembers = async () => {
            const data = await getCommunityMembers(propertyId);
            setMembers(data);
        };
        fetchMessages();
        fetchMembers();
    }, [propertyId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const tempMsg = await sendCommunityMessage(propertyId, input, replyingTo || undefined);
        setMessages([...messages, tempMsg]); 
        setInput('');
        setReplyingTo(null);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-lg relative">
             
             {/* Members Modal */}
             <Modal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} title="Community Members">
                 <div className="space-y-3 max-h-80 overflow-y-auto">
                     {members.map(member => (
                         <div key={member.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                             <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                                     {member.name.substring(0, 2).toUpperCase()}
                                 </div>
                                 <span className="font-medium text-neutral-800 dark:text-neutral-200">{member.name}</span>
                             </div>
                             <span className="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400">{member.role}</span>
                         </div>
                     ))}
                 </div>
             </Modal>

             {/* Chat Header */}
             <div className="p-4 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between shadow-sm z-10">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md text-white">
                        <UsersIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-neutral-800 dark:text-neutral-200">{propertyName} Community</h3>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <p className="text-xs text-neutral-500">Online</p>
                        </div>
                    </div>
                 </div>
                 {profile?.role === UserRole.Owner && (
                     <button onClick={() => setIsMembersModalOpen(true)} className="text-sm text-blue-600 hover:underline font-medium">
                         View Members ({members.length})
                     </button>
                 )}
             </div>

             {/* Messages Area */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ded8] dark:bg-[#0b141a] bg-opacity-30">
                {messages.length === 0 && (
                    <div className="text-center text-neutral-500 mt-10">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.sender_name === (profile?.full_name?.split(' ')[0] || 'Me');
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
                            <div 
                                className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative text-sm cursor-pointer hover:shadow-md transition-shadow group ${
                                    isMe 
                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-tl-none'
                                }`}
                                onClick={() => setReplyingTo(msg)}
                                title="Click to reply"
                            >
                                {msg.replyTo && (
                                    <div className={`mb-2 p-2 rounded border-l-4 text-xs opacity-80 ${isMe ? 'bg-blue-700 border-blue-300' : 'bg-neutral-100 dark:bg-neutral-700 border-blue-500'}`}>
                                        <p className="font-bold mb-0.5">{msg.replyTo.sender_name}</p>
                                        <p className="truncate">{msg.replyTo.text}</p>
                                    </div>
                                )}
                                {!isMe && <p className="text-[10px] font-bold text-orange-600 mb-0.5 opacity-90">{msg.sender_name} <span className="font-normal text-neutral-400">({msg.sender_role})</span></p>}
                                <p className="leading-relaxed">{msg.text}</p>
                                <p className={`text-[9px] text-right mt-1 ${isMe ? 'text-blue-200' : 'text-neutral-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
             </div>

             {/* Reply Banner */}
             {replyingTo && (
                 <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                     <div className="text-sm text-neutral-600 dark:text-neutral-400 truncate pr-4">
                          <span className="font-bold text-blue-600">Replying to {replyingTo.sender_name}:</span> {replyingTo.text}
                     </div>
                     <button onClick={() => setReplyingTo(null)} className="text-neutral-500 hover:text-red-500">
                         <XIcon className="w-4 h-4" />
                     </button>
                 </div>
             )}

             {/* Input Area */}
             <form onSubmit={handleSend} className="p-3 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 flex gap-2">
                 <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white border-none focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                 />
                 <button type="submit" className="p-3 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" disabled={!input.trim()}>
                     <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                 </button>
             </form>
        </div>
    );
};

// --- Main Page ---

const CommunityPage: React.FC = () => {
    const { profile } = useAuth();
    const toast = useToast();
    
    // Navigation State
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [selectedProperty, setSelectedProperty] = useState<{id: string, name: string, community_features?: CommunityFeatures} | null>(null);
    const [activeTab, setActiveTab] = useState<'feed' | 'chat' | 'gate_pass' | 'amenities' | 'marketplace'>('feed');
    
    // Data State
    const [communities, setCommunities] = useState<any[]>([]);
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [marketplaceItems, setMarketplaceItems] = useState<any[]>([
        { id: '1', title: 'Ergonomic Office Chair', price: '₹4,500', category: 'Furniture', image: 'https://images.unsplash.com/photo-1505797149-43b00fe90494?w=400', owner: 'Rahul (Flat 402)' },
        { id: '2', title: 'Mountain Bike', price: '₹12,000', category: 'Sports', image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400', owner: 'Priya (Flat 205)' },
        { id: '3', title: 'Kindle Paperwhite', price: '₹6,000', category: 'Electronics', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', owner: 'Amit (Flat 101)' },
    ]);
    const [currentFeatures, setCurrentFeatures] = useState<CommunityFeatures>({ enable_chat: true, enable_polls: true, enable_gate_pass: true, enable_amenities: true });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Modals State
    const [isPassModalOpen, setIsPassModalOpen] = useState(false);
    const [isPollModalOpen, setIsPollModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isAmenityModalOpen, setIsAmenityModalOpen] = useState(false);

    // Create Actions State
    const [creating, setCreating] = useState(false);
    
    // Form States
    const [visitorName, setVisitorName] = useState('');
    const [visitorType, setVisitorType] = useState('Guest');
    
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['Yes', 'No']);
    
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementMessage, setAnnouncementMessage] = useState('');
    const [isGeneratingAnnouncement, setIsGeneratingAnnouncement] = useState(false);

    const [amenityName, setAmenityName] = useState('');
    const [amenityCapacity, setAmenityCapacity] = useState('');
    const [amenityOpen, setAmenityOpen] = useState('09:00');
    const [amenityClose, setAmenityClose] = useState('22:00');

    // Initial Load
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            setError(null);
            try {
                if (profile?.role === UserRole.Owner) {
                    const response = await getProperties(1, 100);
                    setCommunities(response.data);
                } else {
                    const tenantProp = { id: '1', name: 'My Building', community_features: { enable_chat: true, enable_polls: true, enable_gate_pass: true, enable_amenities: true } };
                    handlePropertyClick(tenantProp);
                }
            } catch (e: any) {
                console.error("Failed to load communities", e);
                setError(e.message || "Failed to load communities.");
                toast.error("Failed to load community data.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [profile, toast]);

    const handlePropertyClick = (property: any) => {
        setSelectedProperty(property);
        setCurrentFeatures(property.community_features || { enable_chat: true, enable_polls: true, enable_gate_pass: true, enable_amenities: true });
        
        const feats = property.community_features || { enable_chat: true, enable_polls: true, enable_gate_pass: true, enable_amenities: true };
        if (feats.enable_polls) setActiveTab('feed');
        else if (feats.enable_chat) setActiveTab('chat');
        else if (feats.enable_gate_pass) setActiveTab('gate_pass');
        else setActiveTab('amenities');

        setViewMode('detail');
    };

    const handleBack = () => {
        setViewMode('list');
        setSelectedProperty(null);
        setVisitors([]);
        setAmenities([]);
        setPolls([]);
        setAnnouncements([]);
    };

    useEffect(() => {
        if (!selectedProperty) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const promises = [];
                if (currentFeatures.enable_gate_pass) promises.push(getVisitors(selectedProperty.id).then(setVisitors));
                if (currentFeatures.enable_amenities) promises.push(getAmenities(selectedProperty.id).then(setAmenities));
                if (currentFeatures.enable_polls) {
                    promises.push(getActivePolls(selectedProperty.id).then(setPolls));
                    promises.push(getAnnouncements(1, 10).then(res => setAnnouncements(res.data)));
                }
                await Promise.all(promises);
            } catch (e) {
                console.error(e);
                toast.error("Failed to load some community features.");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [selectedProperty, currentFeatures, toast]);

    const handleCreatePass = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedProperty) return;
        setCreating(true);
        try {
            const newVisitor = await createVisitorPass(visitorName, visitorType, selectedProperty.id);
            setVisitors([newVisitor, ...visitors]);
            setIsPassModalOpen(false);
            setVisitorName('');
            toast.success("Visitor pass created successfully!");
        } catch(e) { 
            toast.error("Failed to create pass.");
        } finally { setCreating(false); }
    };

    const handleCreatePoll = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedProperty) return;
        setCreating(true);
        try {
            const newPoll = await createPoll(pollQuestion, pollOptions, selectedProperty.id);
            setPolls([newPoll, ...polls]);
            setIsPollModalOpen(false);
            setPollQuestion('');
            setPollOptions(['Yes', 'No']);
            toast.success("Poll published!");
        } catch(e) { toast.error("Failed to create poll."); } finally { setCreating(false); }
    };

    const handleCreateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProperty) return;
        setCreating(true);
        try {
            const newAnnouncement = await createAnnouncement({
                title: announcementTitle,
                message: announcementMessage,
                audience: 'specific_building',
                target_id: selectedProperty.id
            });
            setAnnouncements([newAnnouncement, ...announcements]);
            setIsAnnouncementModalOpen(false);
            setAnnouncementTitle('');
            setAnnouncementMessage('');
            toast.success("Notice posted to community.");
        } catch (err: any) {
            toast.error(`Failed to post notice: ${err.message}`);
        } finally {
            setCreating(false);
        }
    };

    const handleCreateAmenity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProperty) return;
        setCreating(true);
        try {
            const newAmenity = await createAmenity({
                name: amenityName,
                capacity: parseInt(amenityCapacity, 10) || 0,
                open_time: amenityOpen,
                close_time: amenityClose
            }, selectedProperty.id);
            setAmenities([...amenities, newAmenity]);
            setIsAmenityModalOpen(false);
            setAmenityName('');
            setAmenityCapacity('');
            toast.success("New amenity added!");
        } catch(err: any) {
            toast.error(`Failed to create amenity: ${err.message}`);
        } finally {
            setCreating(false);
        }
    };

    const generateAnnouncementAI = async () => {
         if (!announcementTitle) return;
         setIsGeneratingAnnouncement(true);
         try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
            const prompt = `Write a short, professional announcement for tenants regarding: "${announcementTitle}".`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt
            });
            setAnnouncementMessage(response.text || '');
            toast.info("Draft generated by AI.");
         } catch(e) {
            toast.error("AI Generation failed. Please try again.");
         } finally {
            setIsGeneratingAnnouncement(false);
         }
    }

    const renderDetailContent = () => {
        if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

        if (activeTab === 'feed') {
            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    <div className="lg:col-span-2 space-y-6">
                         <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Community Polls</h3>
                            <button onClick={() => setIsPollModalOpen(true)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                                <PlusCircleIcon className="w-4 h-4"/> Create Poll
                            </button>
                         </div>
                         <div className="grid gap-4">
                            {polls.map(p => <PollCard key={p.id} poll={p} />)}
                            {polls.length === 0 && <p className="text-neutral-500 py-6 text-center bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-100 dark:border-neutral-800">No active polls.</p>}
                         </div>

                         <div className="flex justify-between items-center mt-8 mb-4">
                            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Notice Board</h3>
                            <button onClick={() => setIsAnnouncementModalOpen(true)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                                <MegaphoneIcon className="w-4 h-4"/> Post Notice
                            </button>
                         </div>
                         <Card className="p-0 overflow-hidden">
                            {announcements.map(a => <AnnouncementFeedItem key={a.id} announcement={a} />)}
                            {announcements.length === 0 && <div className="p-8 text-center text-neutral-500">No recent notices.</div>}
                         </Card>
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-none">
                             <h4 className="font-bold text-lg mb-2">Community Rules</h4>
                             <ul className="text-sm text-blue-50 space-y-2 list-disc pl-4 leading-relaxed">
                                 <li>Quiet hours: 10 PM - 6 AM</li>
                                 <li>Clean up after pets immediately</li>
                                 <li>No parking in guest spots</li>
                                 <li>Respect shared amenities</li>
                             </ul>
                        </Card>
                    </div>
                </div>
            );
        }

        if (activeTab === 'chat') {
            return <CommunityChat propertyId={selectedProperty!.id} propertyName={selectedProperty!.name} />;
        }

        if (activeTab === 'gate_pass') {
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">Gate Passes</h3>
                            <p className="text-sm text-neutral-500">Manage entry permissions for visitors.</p>
                        </div>
                        <button onClick={() => setIsPassModalOpen(true)} className="btn btn-primary flex items-center gap-2">
                            <PlusCircleIcon className="w-5 h-5" /> New Pass
                        </button>
                    </div>
                    <div className="grid gap-4">
                        {visitors.map(v => <VisitorCard key={v.id} visitor={v} />)}
                        {visitors.length === 0 && <p className="text-neutral-500 py-12 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">No active visitors. Create a pass to get started.</p>}
                    </div>
                </div>
            );
        }

        if (activeTab === 'amenities') {
            return (
                 <div className="space-y-6 animate-fade-in">
                     <div className="flex justify-end">
                         {profile?.role === UserRole.Owner && (
                             <button onClick={() => setIsAmenityModalOpen(true)} className="btn btn-primary flex items-center gap-2">
                                 <PlusCircleIcon className="w-5 h-5" /> Add Amenity
                             </button>
                         )}
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {amenities.map(a => <AmenityCard key={a.id} amenity={a} />)}
                        {amenities.length === 0 && <p className="col-span-full text-neutral-500 py-12 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">No amenities added yet.</p>}
                     </div>
                 </div>
            );
        }

        if (activeTab === 'marketplace') {
            return (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex justify-between items-center bg-blue-600 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-600/20 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black tracking-tight">Building Marketplace</h3>
                            <p className="text-blue-100 text-sm opacity-80 font-medium">Buying & selling within {selectedProperty?.name}</p>
                        </div>
                        <button className="relative z-10 px-6 py-2.5 bg-white text-blue-600 text-xs font-black rounded-xl hover:bg-blue-50 transition-all active:scale-95 shadow-lg">
                            POST AN AD
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {marketplaceItems.map(item => (
                            <Card key={item.id} className="p-0 overflow-hidden group hover:shadow-2xl transition-all duration-500 rounded-[1.5rem] border-none shadow-sm bg-white dark:bg-neutral-800">
                                <div className="h-48 overflow-hidden relative">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/10">
                                        {item.category}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-black text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">{item.title}</h4>
                                        <p className="text-lg font-black text-blue-600 dark:text-blue-400">{item.price}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-5 h-5 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                                            <UsersIcon className="w-3 h-3 text-neutral-500" />
                                        </div>
                                        <p className="text-xs text-neutral-500 font-medium">{item.owner}</p>
                                    </div>
                                    <button className="w-full py-3 bg-neutral-100 dark:bg-neutral-700 hover:bg-blue-600 hover:text-white transition-all text-xs font-black rounded-xl uppercase tracking-widest">
                                        Contact Seller
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            );
        }
    };

    if (viewMode === 'list') {
        return (
            <div className="space-y-8 animate-fade-in">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">Community Hub</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-2 text-lg">Select a property to access its digital community.</p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800 mb-6">
                        <h3 className="text-red-800 dark:text-red-200 font-bold mb-2">Error Loading Communities</h3>
                        <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
                    </div>
                )}

                {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {communities.map(comm => (
                            <CommunityCard key={comm.id} property={comm} onClick={() => handlePropertyClick(comm)} />
                        ))}
                        {communities.length === 0 && !error && (
                            <div className="col-span-full text-center py-12 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                                <p className="text-neutral-500">No properties found.</p>
                                <p className="text-sm text-neutral-400">Add properties with multiple units to see them here.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <Modal isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} title="Create Visitor Pass">
                <form onSubmit={handleCreatePass} className="space-y-4">
                    <div>
                        <label className="label">Visitor Name</label>
                        <input type="text" value={visitorName} onChange={e => setVisitorName(e.target.value)} className="form-input" required />
                    </div>
                    <div>
                        <label className="label">Type</label>
                        <select value={visitorType} onChange={e => setVisitorType(e.target.value)} className="form-input">
                            <option>Guest</option>
                            <option>Delivery</option>
                            <option>Service</option>
                            <option>Cab</option>
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100 dark:border-neutral-700 mt-4">
                        <button type="button" onClick={() => setIsPassModalOpen(false)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={creating} className="btn btn-primary">{creating ? 'Generating...' : 'Generate Pass'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isPollModalOpen} onClose={() => setIsPollModalOpen(false)} title="New Poll">
                 <form onSubmit={handleCreatePoll} className="space-y-4">
                    <div>
                        <label className="label">Question</label>
                        <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} className="form-input" placeholder="e.g. Weekend Potluck?" required />
                    </div>
                    <div>
                        <label className="label">Options (Comma separated)</label>
                        <input type="text" value={pollOptions.join(', ')} onChange={e => setPollOptions(e.target.value.split(',').map(s=>s.trim()))} className="form-input" placeholder="Yes, No, Maybe" required />
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100 dark:border-neutral-700 mt-4">
                        <button type="button" onClick={() => setIsPollModalOpen(false)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={creating} className="btn btn-primary">{creating ? 'Posting...' : 'Post Poll'}</button>
                    </div>
                 </form>
            </Modal>

            <Modal isOpen={isAnnouncementModalOpen} onClose={() => setIsAnnouncementModalOpen(false)} title="Post Notice">
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                    <div>
                        <label className="label">Title / Topic</label>
                        <input type="text" value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} className="form-input" required />
                    </div>
                    <div>
                        <div className="flex justify-between items-center">
                            <label className="label">Message</label>
                            <button type="button" onClick={generateAnnouncementAI} disabled={isGeneratingAnnouncement || !announcementTitle} className="text-xs text-blue-600 hover:underline">
                                {isGeneratingAnnouncement ? 'Generating...' : 'Auto-Write with AI'}
                            </button>
                        </div>
                        <textarea value={announcementMessage} onChange={e => setAnnouncementMessage(e.target.value)} rows={4} className="form-input" required />
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100 dark:border-neutral-700 mt-4">
                        <button type="button" onClick={() => setIsAnnouncementModalOpen(false)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={creating} className="btn btn-primary">{creating ? 'Posting...' : 'Post Notice'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isAmenityModalOpen} onClose={() => setIsAmenityModalOpen(false)} title="Add New Amenity">
                <form onSubmit={handleCreateAmenity} className="space-y-4">
                    <div>
                        <label className="label">Amenity Name</label>
                        <input type="text" value={amenityName} onChange={e => setAmenityName(e.target.value)} className="form-input" placeholder="e.g., Swimming Pool, Gym" required />
                    </div>
                    <div>
                        <label className="label">Capacity</label>
                        <input type="number" value={amenityCapacity} onChange={e => setAmenityCapacity(e.target.value)} className="form-input" placeholder="Max people allowed" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Open Time</label>
                            <input type="time" value={amenityOpen} onChange={e => setAmenityOpen(e.target.value)} className="form-input" required />
                        </div>
                        <div>
                            <label className="label">Close Time</label>
                            <input type="time" value={amenityClose} onChange={e => setAmenityClose(e.target.value)} className="form-input" required />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100 dark:border-neutral-700 mt-4">
                        <button type="button" onClick={() => setIsAmenityModalOpen(false)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={creating} className="btn btn-primary">{creating ? 'Adding...' : 'Add Amenity'}</button>
                    </div>
                </form>
            </Modal>

            <div className="flex items-center gap-4 mb-6">
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors">
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{selectedProperty?.name}</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Community Hub</p>
                </div>
            </div>

            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide border-b border-neutral-200 dark:border-neutral-800">
                 {currentFeatures.enable_polls && (
                    <button 
                        onClick={() => setActiveTab('feed')} 
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'feed' 
                            ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:hover:text-neutral-300'
                        }`}
                    >
                        <MegaphoneIcon className="w-4 h-4" /> Notice Board
                    </button>
                 )}
                 {currentFeatures.enable_chat && (
                    <button 
                        onClick={() => setActiveTab('chat')} 
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'chat' 
                            ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:hover:text-neutral-300'
                        }`}
                    >
                        <MessageSquareIcon className="w-4 h-4" /> Group Chat
                    </button>
                 )}
                 {currentFeatures.enable_gate_pass && (
                    <button 
                        onClick={() => setActiveTab('gate_pass')} 
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'gate_pass' 
                            ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:hover:text-neutral-300'
                        }`}
                    >
                        <ShieldCheckIcon className="w-4 h-4" /> Gate Pass
                    </button>
                 )}
                 {currentFeatures.enable_amenities && (
                    <button 
                        onClick={() => setActiveTab('amenities')} 
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'amenities' 
                            ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:hover:text-neutral-300'
                        }`}
                    >
                        <CalendarDaysIcon className="w-4 h-4" /> Amenities
                    </button>
                 )}
                 <button 
                     onClick={() => setActiveTab('marketplace')} 
                     className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                         activeTab === 'marketplace' 
                         ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' 
                         : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:hover:text-neutral-300'
                     }`}
                 >
                     <ShoppingBagIcon className="w-4 h-4" /> Marketplace
                 </button>
            </div>

            {renderDetailContent()}
            
            <style>{`.label { display: block; font-size: 0.875rem; font-weight: 500; color: #475569; margin-bottom: 0.25rem; } .dark .label { color: #94a3b8; } .form-input { display: block; width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; background-color: white; color: #0f172a; transition: all 0.2s; } .dark .form-input { border-color: #475569; background-color: #334155; color: #f1f5f9; } .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); outline: none; }`}</style>
        </div>
    );
};

export default CommunityPage;
