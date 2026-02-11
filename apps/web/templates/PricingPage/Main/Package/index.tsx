"use client";

import { useState } from "react";
import { twMerge } from "tailwind-merge";
import Icon from "@/components/Icon";
import { createCheckoutSession } from "@/actions/billing.actions";

type PackageProps = {
    plan?: boolean;
    item: any;
};

const Package = ({ plan, item }: PackageProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpgrade = async () => {
        // Don't allow clicking if it's the current plan or already loading
        if (item.currentPlan || isLoading) return;

        // Map Brainwave package names to FasterClaw plans
        const planMapping: Record<string, "starter" | "pro" | "enterprise"> = {
            Free: "starter",
            Pro: "pro",
            Enterprise: "enterprise",
        };

        const selectedPlan = planMapping[item.title as keyof typeof planMapping];

        if (!selectedPlan) {
            setError("Invalid plan selected");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await createCheckoutSession(selectedPlan);

            if (result.success) {
                // Redirect to Stripe checkout
                window.location.href = result.data;
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError("Failed to create checkout session");
            console.error("Checkout error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className={`flex basis-1/3 border-r-2 border-n-3 p-8 bg-n-1 first:rounded-l-3xl last:rounded-r-3xl last:border-none 2xl:px-6 lg:shrink-0 lg:basis-[18.5rem] dark:bg-n-7 dark:border-n-6 ${
                item.popular &&
                "relative text-n-1 before:absolute before:-top-4 before:left-0 before:right-0 before:-bottom-4 before:bg-n-6 before:rounded-3xl dark:text-n-7 dark:before:bg-n-2"
            }`}
        >
            <div className="relative flex flex-col grow z-2">
                <div className="flex justify-between items-center mb-1">
                    <div className="h4" style={{ color: item.colorTitle }}>
                        {item.title}
                    </div>
                    {item.popular && (
                        <div className="shrink-0 ml-4 px-3 py-0.5 bg-[#FF97E8] rounded caption1 font-semibold text-n-7">
                            Popular
                        </div>
                    )}
                </div>
                <div className="mb-6 base1 font-semibold">{item.description}</div>
                <div className="mb-2">
                    <span className="mr-2 h2">
                        ${plan ? item.priceYear : item.priceMonth}
                    </span>
                    <span
                        className={twMerge(
                            `h4 text-n-4/50 ${item.popular && "text-n-4"}`
                        )}
                    >
                        /{plan ? "year" : "mo"}
                    </span>
                </div>
                <div className="base1 text-n-4">{item.priceDetails}</div>
                <div
                    className={`grow space-y-4 mt-6 pt-6 border-t border-n-3 dark:border-n-6 ${
                        item.popular && "border-n-5 dark:border-n-4/25"
                    }`}
                >
                    {item.details.map((x: any, index: number) => (
                        <div className="flex base2" key={index}>
                            <Icon
                                className={twMerge(
                                    `mr-3 fill-n-4/50 ${item.popular && "fill-n-4"}`
                                )}
                                name="check-circle"
                            />
                            {x}
                        </div>
                    ))}
                </div>
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm dark:bg-red-900/20 dark:border-red-800">
                        {error}
                    </div>
                )}
                <button
                    className={`${
                        item.currentPlan && "opacity-50 pointer-events-none"
                    } ${
                        item.popular ? "btn-blue" : "btn-stroke-light"
                    } w-full mt-8 ${isLoading && "opacity-70 cursor-wait"}`}
                    onClick={handleUpgrade}
                    disabled={item.currentPlan || isLoading}
                >
                    {isLoading
                        ? "Loading..."
                        : item.currentPlan
                        ? "Current plan"
                        : "Upgrade"}
                </button>
            </div>
        </div>
    );
};

export default Package;
