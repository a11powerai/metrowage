"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Upload, Image as ImageIcon, Send, X, Loader2, Check, Trash2, Minus } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export default function MetrowageAgent() {
    const { data: session, status } = useSession();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [suggestedActions, setSuggestedActions] = useState<any[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Ensure hydration matches strictly between server and client
    if (!mounted) {
        return null;
    }

    // Dynamic Permission check
    const userRole = (session?.user as any)?.role;
    const userPermissions = (session?.user as any)?.permissions || [];

    // Only allow if SuperAdmin OR has ai.use permission
    const hasAccess = userRole === "SuperAdmin" || userPermissions.includes("ai.use");

    // Fix hydration: Wait until NextAuth determines session status on the client
    if (status !== "authenticated" || !hasAccess) {
        return null;
    }

    // Scroll to bottom
    // biome-ignore lint/correctness/useExhaustiveDependencies: scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, suggestedActions]);

    // Global Paste Listener
    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            if (!isOpen) return;
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = (event) => setImage(event.target?.result as string);
                        reader.readAsDataURL(blob);
                        toast.info("Image pasted into Agent");
                    }
                }
            }
        };

        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [isOpen]);

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => setImage(event.target?.result as string);
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setImage(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async () => {
        if (!input && !image) return;

        const userMsg = { role: 'user', content: input, image: image };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        const currentImage = image;
        setImage(null);
        setIsProcessing(true);

        try {
            const res = await fetch('/api/ai/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: input,
                    image: currentImage,
                    context: { location: (session.user as any)?.location }
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "AI request failed");
            }

            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
            if (data.actions && data.actions.length > 0) {
                setSuggestedActions(data.actions);
            }
        } catch (error: any) {
            console.error("AI Error:", error);
            toast.error(error.message || "AI Assistant is currently unavailable");
        } finally {
            setIsProcessing(false);
        }
    };

    const executeAction = async (action: any, index: number) => {
        try {
            const res = await fetch('/api/ai/agent/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(action)
            });

            if (res.ok) {
                toast.success("Action applied successfully. Data revalidation may be required.");
                setSuggestedActions(prev => prev.filter((_, i) => i !== index));
            } else {
                throw new Error("Execution failed");
            }
        } catch (e) {
            toast.error("Failed to apply change");
        }
    };

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50 group"
            >
                <Sparkles className="text-white w-8 h-8 group-hover:rotate-12 transition-transform" />
                <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">
                    AI
                </div>
            </button>
        );
    }

    return (
        <div className="fixed top-4 right-8 w-[450px] h-[calc(100vh-2rem)] max-h-[700px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-right-8 duration-300">
            {/* Header */}
            <div className="p-4 bg-purple-900 border-b border-purple-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">Metrowage AI</h3>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-[10px] text-purple-200 font-medium">Ready for instructions</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Minimize"
                    >
                        <Minus className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMessages([]);
                            setSuggestedActions([]);
                            setInput("");
                            setImage(null);
                            setIsOpen(false);
                        }}
                        className="p-2 text-red-300 hover:text-white hover:bg-red-500/50 rounded-lg transition-all"
                        title="Close & Clear"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Chat Content */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
                ref={scrollRef}
                onPaste={handlePaste}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => setImage(event.target?.result as string);
                        reader.readAsDataURL(file);
                    }
                }}
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-6">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-gray-200 shadow-sm mb-2">
                            <ImageIcon className="text-gray-400 w-8 h-8" />
                        </div>
                        <h4 className="text-gray-900 font-bold">How can I help you today?</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Ask me questions about workers, wages, or tell me to update a worker's details. You can also paste an image to extract records!
                        </p>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 whitespace-pre-wrap text-sm shadow-sm ${m.role === 'user'
                            ? 'bg-purple-600 text-white font-medium'
                            : 'bg-white text-gray-800 border border-gray-200 leading-relaxed'
                            }`}>
                            {m.image && <img src={m.image} alt="Upload" className="rounded-lg mb-2 max-h-48 w-full object-cover border border-gray-200" />}
                            {m.content}
                        </div>
                    </div>
                ))}

                {isProcessing && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                            <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                            <span className="text-xs text-gray-500">Processing...</span>
                        </div>
                    </div>
                )}

                {/* Suggested Actions */}
                {suggestedActions.length > 0 && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-left-4 mt-6">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                <Check className="w-3 h-3 text-green-500" />
                                Proposed Actions
                            </div>
                        </div>
                        {suggestedActions.map((action, idx) => (
                            <div key={idx} className="bg-white border border-purple-200 rounded-xl overflow-hidden shadow-sm hover:border-purple-400 transition-all">
                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={'text-[9px] font-bold px-2 py-0.5 rounded uppercase bg-purple-100 text-purple-700'}>
                                            {action.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <pre className="text-xs bg-gray-50 p-2 rounded text-gray-700 overflow-x-auto border border-gray-100 mt-2">
                                        {JSON.stringify(action.data, null, 2)}
                                    </pre>
                                </div>
                                <div className="flex border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => executeAction(action, idx)}
                                        className="flex-1 p-2.5 text-xs font-bold text-green-600 hover:bg-green-50 transition flex items-center justify-center gap-2 border-r border-gray-100"
                                    >
                                        <Check className="w-4 h-4" />
                                        Approve & Run
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSuggestedActions(prev => prev.filter((_, i) => i !== idx))}
                                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition px-4"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Footer */}
            <div className="p-4 bg-white border-t border-gray-200">
                {image && (
                    <div className="relative inline-block mb-3 animate-in zoom-in-50">
                        <img src={image} alt="Preview" className="w-16 h-16 object-cover rounded-xl border-2 border-purple-500 shadow-sm" />
                        <button
                            type="button"
                            onClick={() => setImage(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-gray-100 text-gray-500 hover:text-purple-600 rounded-xl transition-colors border border-gray-200"
                    >
                        <Upload className="w-5 h-5" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*"
                    />
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type or paste image..."
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 outline-none pr-12 transition-all"
                        />
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={isProcessing || (!input && !image)}
                            className="absolute right-2 top-2 p-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-lg transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
