import { useState, useRef, useEffect, type ChangeEvent } from "react";
import Message from "@/components/Message";
import Menu from "@/components/Menu";
import Question from "@/components/Question";
import Answer from "@/components/Answer";
import { sendChatMessage, uploadChatFile, getInstance } from "@/actions/instances.actions";
import type { Instance } from "@fasterclaw/api-client";
import { navigation } from "@/constants/navigation";
import toast from "react-hot-toast";

interface AttachedFile {
    file: File;
    previewUrl?: string;
    name: string;
    isImage: boolean;
}

interface UploadedFile {
    filePath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
}

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    fileName?: string;
    isImage?: boolean;
    imagePreview?: string;
}

interface MainProps {
    instance: Instance | null;
}

const Main = ({ instance: initialInstance }: MainProps) => {
    const [message, setMessage] = useState<string>("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [instance, setInstance] = useState(initialInstance);
    const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Poll for instance status if not yet running
    useEffect(() => {
        if (
            !instance ||
            instance.status === "RUNNING" ||
            instance.status === "FAILED" ||
            instance.status === "DELETED"
        ) {
            return;
        }

        const interval = setInterval(async () => {
            if (!instance) return;
            const updated = await getInstance(instance.id);
            if (updated) {
                setInstance(updated);
                if (
                    updated.status === "RUNNING" ||
                    updated.status === "FAILED"
                ) {
                    clearInterval(interval);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [instance?.id, instance?.status]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Clean up preview URLs on unmount
    useEffect(() => {
        return () => {
            if (attachedFile?.previewUrl) {
                URL.revokeObjectURL(attachedFile.previewUrl);
            }
        };
    }, [attachedFile]);

    const handleFileSelect = async (file: File) => {
        if (!instance) return;

        const isImage = file.type.startsWith("image/");
        const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

        setAttachedFile({
            file,
            previewUrl,
            name: file.name,
            isImage,
        });

        // Upload the file to the container immediately
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const result = await uploadChatFile(instance.id, formData);
            if (result.success) {
                setUploadedFile(result.data);
            } else {
                toast.error(result.error);
                setAttachedFile(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
            }
        } catch {
            toast.error("Failed to upload file");
            setAttachedFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileRemove = () => {
        if (attachedFile?.previewUrl) {
            URL.revokeObjectURL(attachedFile.previewUrl);
        }
        setAttachedFile(null);
        setUploadedFile(null);
    };

    const handleSend = async () => {
        const hasMessage = message.trim() !== "";
        const hasFile = attachedFile != null && uploadedFile != null;

        if (
            (!hasMessage && !hasFile) ||
            isLoading ||
            isUploading ||
            !instance ||
            instance.status !== "RUNNING"
        )
            return;

        const userMsg: ChatMessage = {
            role: "user",
            content: hasMessage ? message.trim() : `Sent file: ${attachedFile?.name ?? "file"}`,
            timestamp: new Date(),
            fileName: attachedFile?.name,
            isImage: attachedFile?.isImage,
            imagePreview: attachedFile?.previewUrl,
        };

        const filePath = uploadedFile?.filePath;

        setMessages((prev) => [...prev, userMsg]);
        setMessage("");
        setAttachedFile(null);
        setUploadedFile(null);
        setIsLoading(true);

        try {
            const result = await sendChatMessage(
                instance.id,
                hasMessage ? userMsg.content : `Please analyze the attached file: ${attachedFile?.name ?? "file"}`,
                filePath,
            );
            if (result.success && result.data) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: result.data.response,
                        timestamp: new Date(),
                    },
                ]);
            } else {
                const errorMsg = !result.success ? result.error : "No response";
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: `Sorry, something went wrong: ${errorMsg}. Please try again.`,
                        timestamp: new Date(),
                    },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, failed to reach the assistant. Please try again.",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (date: Date) =>
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const isProvisioning =
        instance &&
        (instance.status === "CREATING" ||
            instance.status === "PROVISIONING" ||
            instance.status === "STARTING");

    const isFailed = instance && instance.status === "FAILED";
    const isReady = instance && instance.status === "RUNNING";

    return (
        <>
            <div
                ref={scrollRef}
                className="grow px-10 py-20 overflow-y-auto scroll-smooth scrollbar-none 2xl:py-12 md:px-4 md:pt-0 md:pb-6"
            >
                {messages.length === 0 ? (
                    <>
                        {isProvisioning && (
                            <div className="mb-10 text-center">
                                <div className="h3 leading-[4rem] 2xl:mb-2 2xl:h4">
                                    Setting up your assistant...
                                </div>
                                <div className="body1 text-n-4 2xl:body1S">
                                    This usually takes about 30 seconds. You can
                                    start chatting once it&apos;s ready.
                                </div>
                                <div className="flex justify-center mt-4 space-x-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary-1 animate-pulse" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary-1 animate-pulse [animation-delay:0.2s]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary-1 animate-pulse [animation-delay:0.4s]" />
                                </div>
                            </div>
                        )}
                        {isFailed && (
                            <div className="mb-10 text-center">
                                <div className="h3 leading-[4rem] 2xl:mb-2 2xl:h4">
                                    Setup failed
                                </div>
                                <div className="body1 text-n-4 2xl:body1S">
                                    Please visit the Dashboard to retry instance
                                    creation.
                                </div>
                            </div>
                        )}
                        {(isReady || !instance) && (
                            <>
                                <div className="mb-10 text-center">
                                    <div className="h3 leading-[4rem] 2xl:mb-2 2xl:h4">
                                        {instance
                                            ? "Start a conversation"
                                            : "Unlock the power of AI"}
                                    </div>
                                    <div className="body1 text-n-4 2xl:body1S">
                                        {instance
                                            ? "Send a message or upload a file to your AI assistant"
                                            : "Chat with the smartest AI - Experience the power of AI with us"}
                                    </div>
                                </div>
                                {!instance && (
                                    <Menu
                                        className="max-w-[30.75rem] mx-auto"
                                        items={navigation}
                                    />
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <div className="space-y-6 pb-6">
                        {messages.map((msg, i) =>
                            msg.role === "user" ? (
                                <Question
                                    key={i}
                                    content={msg.content}
                                    document={msg.fileName && !msg.isImage ? msg.fileName : undefined}
                                    image={msg.imagePreview}
                                    time={formatTime(msg.timestamp)}
                                />
                            ) : (
                                <Answer
                                    key={i}
                                    time={formatTime(msg.timestamp)}
                                >
                                    {msg.content}
                                </Answer>
                            )
                        )}
                        {isLoading && <Answer loading />}
                    </div>
                )}
            </div>
            <Message
                value={message}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { setMessage(e.target.value); }}
                onSend={() => { void handleSend(); }}
                onFileSelect={(file: File) => { void handleFileSelect(file); }}
                onFileRemove={handleFileRemove}
                onTranscript={(text: string) => { setMessage(text); }}
                attachedFile={attachedFile}
                isUploading={isUploading}
                disabled={isLoading || !isReady}
                placeholder={
                    !instance
                        ? "Ask Brainwave anything"
                        : !isReady
                          ? "Waiting for assistant to be ready..."
                          : "Type your message or attach a file..."
                }
            />
        </>
    );
};

export default Main;
