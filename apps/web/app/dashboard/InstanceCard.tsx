"use client";

import { useState } from "react";
import type { Instance } from "@fasterclaw/api-client";
import Icon from "@/components/Icon";
import {
    startInstance,
    stopInstance,
    deleteInstance,
    retryInstance,
} from "@/actions/instances.actions";

type InstanceCardProps = {
    instance: Instance;
    onUpdate: (instance: Instance) => void;
    onDelete: (id: string) => void;
};

const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
        case "RUNNING":
            return "text-green-500";
        case "STOPPED":
            return "text-n-4";
        case "CREATING":
        case "STARTING":
        case "STOPPING":
            return "text-yellow-500";
        case "FAILED":
        case "ERROR":
            return "text-red-500";
        default:
            return "text-n-4";
    }
};

const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
        case "RUNNING":
            return "check";
        case "STOPPED":
            return "pause";
        case "CREATING":
        case "STARTING":
        case "STOPPING":
            return "clock";
        case "FAILED":
        case "ERROR":
            return "close";
        default:
            return "dots";
    }
};

const InstanceCard = ({ instance, onUpdate, onDelete }: InstanceCardProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStart = async () => {
        setIsLoading(true);
        setError(null);
        const result = await startInstance(instance.id);
        setIsLoading(false);

        if (result.success) {
            onUpdate(result.data);
        } else {
            setError(result.error);
        }
    };

    const handleStop = async () => {
        setIsLoading(true);
        setError(null);
        const result = await stopInstance(instance.id);
        setIsLoading(false);

        if (result.success) {
            onUpdate(result.data);
        } else {
            setError(result.error);
        }
    };

    const handleRetry = async () => {
        setIsLoading(true);
        setError(null);
        const result = await retryInstance(instance.id);
        setIsLoading(false);

        if (result.success) {
            onUpdate(result.data);
        } else {
            setError(result.error);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${instance.name}"?`)) {
            return;
        }

        setIsLoading(true);
        setError(null);
        const result = await deleteInstance(instance.id);
        setIsLoading(false);

        if (result.success) {
            onDelete(instance.id);
        } else {
            setError(result.error);
        }
    };

    const isRunning = instance.status.toUpperCase() === "RUNNING";
    const isStopped = instance.status.toUpperCase() === "STOPPED";
    const isFailed = ["FAILED", "ERROR"].includes(instance.status.toUpperCase());
    const isTransitioning = ["CREATING", "STARTING", "STOPPING"].includes(
        instance.status.toUpperCase()
    );

    return (
        <div className="flex flex-col w-[calc(33.333%-3.5rem)] mx-7 mt-16 2xl:w-[calc(33.333%-2rem)] 2xl:mx-4 2xl:mt-12 lg:w-[calc(50%-2rem)] md:w-full md:mx-0 md:mt-10 p-6 bg-n-2 dark:bg-n-7 rounded-xl border-2 border-n-3 dark:border-n-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="base1 font-semibold">{instance.name}</div>
                        <div className={`flex items-center gap-1 caption1 ${getStatusColor(instance.status)}`}>
                            <Icon
                                className={isTransitioning ? "animate-spin" : ""}
                                name={getStatusIcon(instance.status)}
                            />
                            <span>{instance.status}</span>
                        </div>
                    </div>
                    <div className="caption1 text-n-4">
                        Provider: {instance.provider}
                    </div>
                    <div className="caption1 text-n-4">
                        Model: {instance.aiModel}
                    </div>
                    {instance.region && (
                        <div className="caption1 text-n-4">
                            Region: {instance.region}
                        </div>
                    )}
                    {instance.ipAddress && (
                        <div className="caption1 text-n-4">
                            IP: {instance.ipAddress}
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="caption1 text-red-500">{error}</div>
                </div>
            )}

            <div className="flex gap-2 mt-auto">
                {isStopped && (
                    <button
                        className="btn-stroke-light flex-1"
                        onClick={handleStart}
                        disabled={isLoading}
                    >
                        <Icon name="play" />
                        <span>Start</span>
                    </button>
                )}

                {isRunning && (
                    <button
                        className="btn-stroke-light flex-1"
                        onClick={handleStop}
                        disabled={isLoading}
                    >
                        <Icon name="pause" />
                        <span>Stop</span>
                    </button>
                )}

                {isFailed && (
                    <button
                        className="btn-stroke-light flex-1"
                        onClick={handleRetry}
                        disabled={isLoading}
                    >
                        <Icon name="play" />
                        <span>Retry</span>
                    </button>
                )}

                {isTransitioning && (
                    <button
                        className="btn-stroke-light flex-1"
                        disabled
                    >
                        <Icon className="animate-spin" name="clock" />
                        <span>Processing...</span>
                    </button>
                )}

                <button
                    className="btn-stroke-light w-10 h-10 !p-0"
                    onClick={handleDelete}
                    disabled={isLoading}
                    title="Delete instance"
                >
                    <Icon className="fill-n-4" name="trash" />
                </button>
            </div>

            <div className="mt-3 pt-3 border-t border-n-3 dark:border-n-6">
                <div className="caption2 text-n-4">
                    Created: {new Date(instance.createdAt).toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};

export default InstanceCard;
