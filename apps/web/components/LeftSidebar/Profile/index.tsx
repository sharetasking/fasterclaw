"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "@/components/Image";
import { getCurrentUser } from "@/actions/auth.actions";
import { getSubscription } from "@/actions/billing.actions";
import type { User, Subscription } from "@fasterclaw/api-client";

type ProfileProps = {
    visible?: boolean;
};

const Profile = ({ visible }: ProfileProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser);

            const subscriptionResult = await getSubscription();
            if (subscriptionResult.success) {
                setSubscription(subscriptionResult.data.subscription);
            }

            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div
                className={`${
                    visible
                        ? "mb-6"
                        : "mb-3 shadow-[0_1.25rem_1.5rem_0_rgba(0,0,0,0.5)]"
                }`}
            >
                <div className={`${!visible && "p-2.5 bg-n-6 rounded-xl"}`}>
                    <div
                        className={`flex items-center ${
                            visible ? "justify-center" : "px-2.5 py-2.5 pb-4.5"
                        }`}
                    >
                        <div className="relative w-10 h-10 rounded-full bg-n-5 animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    // Determine plan name and button text
    const planName = subscription?.plan
        ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
        : "Starter";
    const isPaid = subscription?.plan && subscription.plan !== "starter";
    const buttonText = isPaid ? "Manage Plan" : "Upgrade to Pro";

    return (
        <div
            className={`${
                visible
                    ? "mb-6"
                    : "mb-3 shadow-[0_1.25rem_1.5rem_0_rgba(0,0,0,0.5)]"
            }`}
        >
            <div className={`${!visible && "p-2.5 bg-n-6 rounded-xl"}`}>
                <div
                    className={`flex items-center ${
                        visible ? "justify-center" : "px-2.5 py-2.5 pb-4.5"
                    }`}
                >
                    <div className="relative w-10 h-10">
                        <Image
                            className="rounded-full object-cover"
                            src="/images/avatar.jpg"
                            fill
                            alt="Avatar"
                        />
                        <div className="absolute -right-0.75 -bottom-0.75 w-4.5 h-4.5 bg-primary-2 rounded-full border-4 border-n-6"></div>
                    </div>
                    {!visible && (
                        <>
                            <div className="ml-4 mr-4">
                                <div className="base2 font-semibold text-n-1">
                                    {user.name || "User"}
                                </div>
                                <div className="caption1 font-semibold text-n-3/50">
                                    {user.email}
                                </div>
                            </div>
                            <div className="shrnik-0 ml-auto self-start px-3 bg-primary-2 rounded-lg caption1 font-bold text-n-7">
                                {planName}
                            </div>
                        </>
                    )}
                </div>
                {!visible && (
                    <Link className="btn-stroke-dark w-full mt-2" href="/pricing">
                        {buttonText}
                    </Link>
                )}
            </div>
        </div>
    );
};

export default Profile;
