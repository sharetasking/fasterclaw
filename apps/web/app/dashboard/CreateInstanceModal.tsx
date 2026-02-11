"use client";

import { useState } from "react";
import type { Instance } from "@fasterclaw/api-client";
import Icon from "@/components/Icon";
import {
    createInstance,
    validateTelegramToken,
} from "@/actions/instances.actions";

type CreateInstanceModalProps = {
    onClose: () => void;
    onCreate: (instance: Instance) => void;
};

const CreateInstanceModal = ({ onClose, onCreate }: CreateInstanceModalProps) => {
    const [name, setName] = useState("");
    const [telegramToken, setTelegramToken] = useState("");
    const [region, setRegion] = useState("iad");
    const [aiModel, setAiModel] = useState("gpt-4o-mini");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isValidatingToken, setIsValidatingToken] = useState(false);
    const [tokenValidationResult, setTokenValidationResult] = useState<{
        valid: boolean;
        botUsername?: string;
    } | null>(null);

    const handleValidateToken = async () => {
        if (!telegramToken.trim()) {
            setError("Please enter a Telegram token");
            return;
        }

        setIsValidatingToken(true);
        setError(null);
        setTokenValidationResult(null);

        const result = await validateTelegramToken(telegramToken);
        setIsValidatingToken(false);

        if (result.valid) {
            setTokenValidationResult({
                valid: true,
                botUsername: result.botUsername,
            });
        } else {
            setError(result.error || "Invalid token");
            setTokenValidationResult({ valid: false });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Please enter an instance name");
            return;
        }

        if (!telegramToken.trim()) {
            setError("Please enter a Telegram bot token");
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await createInstance({
            name: name.trim(),
            telegramBotToken: telegramToken.trim(),
            region: region || undefined,
            aiModel: aiModel || undefined,
        });

        setIsLoading(false);

        if (result.success) {
            onCreate(result.data);
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div
                className="absolute inset-0 bg-n-8/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-n-1 dark:bg-n-8 rounded-2xl shadow-2xl">
                <div className="sticky top-0 flex items-center justify-between p-6 border-b border-n-3 dark:border-n-6 bg-n-1 dark:bg-n-8">
                    <div className="h5">Create New Instance</div>
                    <button
                        className="w-10 h-10 rounded-full border-2 border-n-4/25 transition-colors hover:border-transparent hover:bg-n-4/25"
                        onClick={onClose}
                    >
                        <Icon className="fill-n-4" name="close" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <div className="flex items-start gap-3">
                                <Icon className="fill-red-500 shrink-0" name="close" />
                                <div className="caption1 text-red-500">{error}</div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="block mb-2 base2 font-semibold">
                                Instance Name
                            </label>
                            <input
                                type="text"
                                className="w-full h-14 px-5 bg-n-2 border-2 border-transparent rounded-xl outline-none base2 text-n-7 transition-colors placeholder:text-n-4 focus:border-n-3 focus:bg-transparent dark:bg-n-7 dark:text-n-1 dark:focus:bg-n-6 dark:focus:border-n-7"
                                placeholder="My FasterClaw Bot"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div>
                            <label className="block mb-2 base2 font-semibold">
                                Telegram Bot Token
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    className="flex-1 h-14 px-5 bg-n-2 border-2 border-transparent rounded-xl outline-none base2 text-n-7 transition-colors placeholder:text-n-4 focus:border-n-3 focus:bg-transparent dark:bg-n-7 dark:text-n-1 dark:focus:bg-n-6 dark:focus:border-n-7"
                                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                                    value={telegramToken}
                                    onChange={(e) => {
                                        setTelegramToken(e.target.value);
                                        setTokenValidationResult(null);
                                    }}
                                    disabled={isLoading}
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn-stroke-light shrink-0"
                                    onClick={handleValidateToken}
                                    disabled={isValidatingToken || isLoading}
                                >
                                    {isValidatingToken ? (
                                        <>
                                            <Icon className="animate-spin" name="clock" />
                                            <span>Validating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="check" />
                                            <span>Validate</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            {tokenValidationResult?.valid && (
                                <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div className="flex items-center gap-2 caption1 text-green-500">
                                        <Icon name="check" />
                                        <span>
                                            Valid token
                                            {tokenValidationResult.botUsername &&
                                                ` (@${tokenValidationResult.botUsername})`}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="mt-2 caption2 text-n-4">
                                Get your bot token from{" "}
                                <a
                                    href="https://t.me/BotFather"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-1 hover:underline"
                                >
                                    @BotFather
                                </a>
                            </div>
                        </div>

                        <div>
                            <label className="block mb-2 base2 font-semibold">
                                AI Model
                            </label>
                            <select
                                className="w-full h-14 px-5 bg-n-2 border-2 border-transparent rounded-xl outline-none base2 text-n-7 transition-colors focus:border-n-3 focus:bg-transparent dark:bg-n-7 dark:text-n-1 dark:focus:bg-n-6 dark:focus:border-n-7"
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                disabled={isLoading}
                            >
                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                <option value="claude-3-5-sonnet-20241022">
                                    Claude 3.5 Sonnet
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 base2 font-semibold">
                                Region
                            </label>
                            <select
                                className="w-full h-14 px-5 bg-n-2 border-2 border-transparent rounded-xl outline-none base2 text-n-7 transition-colors focus:border-n-3 focus:bg-transparent dark:bg-n-7 dark:text-n-1 dark:focus:bg-n-6 dark:focus:border-n-7"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                                disabled={isLoading}
                            >
                                <option value="iad">US East (iad)</option>
                                <option value="lax">US West (lax)</option>
                                <option value="lhr">Europe (lhr)</option>
                                <option value="syd">Australia (syd)</option>
                                <option value="sin">Singapore (sin)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8 pt-6 border-t border-n-3 dark:border-n-6">
                        <button
                            type="button"
                            className="btn-stroke-light flex-1"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-blue flex-1"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Icon className="animate-spin" name="clock" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="plus" />
                                    <span>Create Instance</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateInstanceModal;
