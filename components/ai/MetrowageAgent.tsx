"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, X, Loader2, Check, Trash2, Minus, Mic, MicOff, Volume2, VolumeX, Upload } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Message {
    role: "user" | "assistant";
    content: string;
    image?: string | null;
}

interface Action {
    type: string;
    data: Record<string, any>;
}

export default function MetrowageAgent() {
    // ALL hooks at the top — no conditional returns before hooks
    const { data: session, status } = useSession();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [suggestedActions, setSuggestedActions] = useState<Action[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [pulseRing, setPulseRing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            synthRef.current = window.speechSynthesis;
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, suggestedActions]);

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
                        reader.onload = (ev) => setImage(ev.target?.result as string);
                        reader.readAsDataURL(blob);
                        toast.info("Image captured, sir.");
                    }
                }
            }
        };
        window.addEventListener("paste", handleGlobalPaste);
        return () => window.removeEventListener("paste", handleGlobalPaste);
    }, [isOpen]);

    const speak = useCallback((text: string) => {
        if (!voiceEnabled || !synthRef.current) return;
        synthRef.current.cancel();
        const clean = text.replace(/[*_#`]/g, "").replace(/\n+/g, ". ");
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1.05;
        utterance.pitch = 0.95;
        // Try to get a good English voice
        const voices = synthRef.current.getVoices();
        const preferred = voices.find(v => v.name.includes("Daniel") || v.name.includes("Google UK English Male") || v.name.includes("Alex"));
        if (preferred) utterance.voice = preferred;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        synthRef.current.speak(utterance);
    }, [voiceEnabled]);

    const stopSpeaking = useCallback(() => {
        synthRef.current?.cancel();
        setIsSpeaking(false);
    }, []);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Voice input not supported in this browser");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((r: any) => r[0].transcript)
                .join("");
            setInput(transcript);
        };
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
        setPulseRing(true);
        setTimeout(() => setPulseRing(false), 2000);
    }, []);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setImage(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async () => {
        if (!input.trim() && !image) return;
        const userMsg: Message = { role: "user", content: input, image };
        setMessages(prev => [...prev, userMsg]);
        const currentInput = input;
        const currentImage = image;
        setInput("");
        setImage(null);
        setIsProcessing(true);

        try {
            const res = await fetch("/api/ai/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: currentInput,
                    image: currentImage,
                    history: messages.slice(-6),
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Request failed");
            }

            const data = await res.json();
            const assistantMsg: Message = { role: "assistant", content: data.message };
            setMessages(prev => [...prev, assistantMsg]);
            if (data.actions?.length > 0) setSuggestedActions(data.actions);
            speak(data.message);
        } catch (error: any) {
            const errMsg = "I'm experiencing a temporary disruption, sir. " + (error.message || "Please try again.");
            setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const executeAction = async (action: Action, index: number) => {
        try {
            const res = await fetch("/api/ai/agent/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action),
            });
            if (res.ok) {
                toast.success("Action executed successfully, sir.");
                setSuggestedActions(prev => prev.filter((_, i) => i !== index));
                speak("Done, sir. The action has been applied.");
            } else {
                throw new Error("Execution failed");
            }
        } catch {
            toast.error("Failed to execute action");
        }
    };

    // All conditional returns AFTER hooks
    if (!mounted) return null;

    const userPermissions: string[] = (session?.user as any)?.permissions || [];
    const userRole = (session?.user as any)?.role;
    const hasAccess = userRole === "SuperAdmin" || userPermissions.includes("ai.use");
    if (status !== "authenticated" || !hasAccess) return null;

    // Floating button when closed
    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 z-50 group"
            >
                <div className="relative w-16 h-16">
                    {/* Animated rings */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 opacity-20 animate-ping" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 opacity-30 animate-pulse" />
                    {/* Core button */}
                    <div className="relative w-16 h-16 bg-gradient-to-tr from-slate-900 via-blue-900 to-slate-900 rounded-full shadow-2xl shadow-blue-500/30 flex items-center justify-center border border-cyan-400/30 group-hover:border-cyan-400/60 group-hover:shadow-cyan-500/40 transition-all duration-300 group-hover:scale-110">
                        <Sparkles className="text-cyan-400 w-7 h-7 group-hover:rotate-12 transition-transform" />
                    </div>
                    <div className="absolute -top-1 -right-1 bg-cyan-400 text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider">
                        J.A.R.V.I.S
                    </div>
                </div>
            </button>
        );
    }

    return (
        <div className="fixed top-4 right-4 w-[440px] h-[calc(100vh-2rem)] max-h-[720px] bg-slate-950 border border-cyan-500/20 rounded-2xl shadow-2xl shadow-cyan-500/10 flex flex-col z-50 overflow-hidden backdrop-blur-xl">
            {/* Header */}
            <div className="relative p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-cyan-500/20">
                {/* Scan line effect */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" />
                </div>
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-400/10 border border-cyan-400/30 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-cyan-50 font-bold text-sm tracking-wide">J.A.R.V.I.S</h3>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? "bg-yellow-400 animate-pulse" : isSpeaking ? "bg-blue-400 animate-pulse" : "bg-cyan-400"}`} />
                                <span className="text-[10px] text-cyan-300/70 font-medium tracking-wider uppercase">
                                    {isProcessing ? "Processing" : isSpeaking ? "Speaking" : isListening ? "Listening" : "Online"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => { setVoiceEnabled(!voiceEnabled); stopSpeaking(); }}
                            className={`p-2 rounded-lg transition-all ${voiceEnabled ? "text-cyan-400 hover:bg-cyan-400/10" : "text-gray-600 hover:bg-gray-800"}`}
                            title={voiceEnabled ? "Mute voice" : "Unmute voice"}
                        >
                            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-gray-500 hover:text-cyan-300 hover:bg-white/5 rounded-lg transition-all"
                            title="Minimize"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMessages([]); setSuggestedActions([]); setInput(""); setImage(null); setIsOpen(false); stopSpeaking(); }}
                            className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Close & Clear"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-950 to-slate-900"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file?.type.startsWith("image/")) {
                        const reader = new FileReader();
                        reader.onload = ev => setImage(ev.target?.result as string);
                        reader.readAsDataURL(file);
                    }
                }}
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-5 px-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-cyan-400/5 border border-cyan-400/20 flex items-center justify-center">
                                <Sparkles className="w-10 h-10 text-cyan-400/60" />
                            </div>
                            <div className="absolute -inset-4 rounded-3xl bg-cyan-400/5 animate-pulse" />
                        </div>
                        <div>
                            <h4 className="text-cyan-50 font-bold text-base">Good day, sir.</h4>
                            <p className="text-cyan-300/50 text-xs mt-2 leading-relaxed max-w-xs">
                                I&apos;m your factory management assistant. Ask me about workers, production, payroll, or tell me what you need done. Voice commands are available.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                            {[
                                "How many workers do we have?",
                                "Show today's attendance summary",
                                "Who has the highest production?",
                                "What's pending in payroll?",
                            ].map(q => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => { setInput(q); }}
                                    className="text-left text-[11px] text-cyan-300/60 bg-cyan-400/5 border border-cyan-400/10 rounded-xl px-3 py-2.5 hover:bg-cyan-400/10 hover:text-cyan-300 hover:border-cyan-400/20 transition-all"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-lg ${
                            m.role === "user"
                                ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
                                : "bg-slate-800/80 text-cyan-50 border border-cyan-500/10 backdrop-blur-sm"
                        }`}>
                            {m.image && (
                                <img src={m.image} alt="Upload" className="rounded-xl mb-2 max-h-40 w-full object-cover border border-white/10" />
                            )}
                            <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                        </div>
                    </div>
                ))}

                {isProcessing && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800/80 border border-cyan-500/10 rounded-2xl p-3.5 flex items-center gap-3">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                            <span className="text-xs text-cyan-300/60">Analyzing, sir...</span>
                        </div>
                    </div>
                )}

                {/* Suggested Actions */}
                {suggestedActions.length > 0 && (
                    <div className="space-y-3 mt-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400/60 px-1">
                            <Check className="w-3 h-3" />
                            Proposed Actions — Awaiting Approval
                        </div>
                        {suggestedActions.map((action, idx) => (
                            <div key={idx} className="bg-slate-800/60 border border-cyan-500/15 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-all">
                                <div className="p-3">
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-400 uppercase tracking-wider">
                                        {action.type.replace(/_/g, " ")}
                                    </span>
                                    <pre className="text-xs bg-slate-900/60 p-2 rounded-lg text-cyan-100/70 overflow-x-auto border border-cyan-500/5 mt-2 font-mono">
                                        {JSON.stringify(action.data, null, 2)}
                                    </pre>
                                </div>
                                <div className="flex border-t border-cyan-500/10">
                                    <button
                                        type="button"
                                        onClick={() => executeAction(action, idx)}
                                        className="flex-1 p-2.5 text-xs font-bold text-cyan-400 hover:bg-cyan-400/10 transition flex items-center justify-center gap-2 border-r border-cyan-500/10"
                                    >
                                        <Check className="w-4 h-4" /> Execute
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSuggestedActions(prev => prev.filter((_, i) => i !== idx))}
                                        className="p-2.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition px-4"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 bg-slate-900/80 border-t border-cyan-500/15">
                {image && (
                    <div className="relative inline-block mb-2">
                        <img src={image} alt="Preview" className="w-14 h-14 object-cover rounded-xl border border-cyan-500/30" />
                        <button type="button" onClick={() => setImage(null)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-slate-800 text-gray-500 hover:text-cyan-400 rounded-xl transition-colors border border-cyan-500/10 hover:border-cyan-500/20"
                    >
                        <Upload className="w-4 h-4" />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />

                    <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        className={`relative p-3 rounded-xl transition-all border ${
                            isListening
                                ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
                                : "bg-slate-800 text-gray-500 hover:text-cyan-400 border-cyan-500/10 hover:border-cyan-500/20"
                        }`}
                    >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        {pulseRing && <div className="absolute inset-0 rounded-xl border-2 border-cyan-400 animate-ping" />}
                    </button>

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                            placeholder={isListening ? "Listening..." : "Ask J.A.R.V.I.S anything..."}
                            className="w-full bg-slate-800 border border-cyan-500/15 rounded-xl px-4 py-3 text-cyan-50 placeholder:text-gray-600 focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/30 outline-none pr-12 text-sm transition-all"
                        />
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={isProcessing || (!input.trim() && !image)}
                            className="absolute right-2 top-1.5 p-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-slate-900 rounded-lg transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-center mt-2">
                    <span className="text-[9px] text-gray-700 tracking-widest uppercase">Powered by Gemini 2.5 Flash</span>
                </div>
            </div>
        </div>
    );
}
