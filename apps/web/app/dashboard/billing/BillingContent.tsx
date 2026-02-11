"use client";

import { useState } from "react";
import Link from "next/link";
import type { SubscriptionResponse, Invoice } from "@fasterclaw/api-client";
import Layout from "@/components/Layout";
import Icon from "@/components/Icon";
import { createPortalSession } from "@/actions/billing.actions";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

type BillingContentProps = {
    subscriptionResult: ActionResult<SubscriptionResponse>;
    invoicesResult: ActionResult<Invoice[]>;
};

const BillingContent = ({
    subscriptionResult,
    invoicesResult,
}: BillingContentProps) => {
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleManageSubscription = async () => {
        setIsLoadingPortal(true);
        setError(null);

        try {
            const result = await createPortalSession();
            if (result.success) {
                window.location.href = result.data;
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError("Failed to open billing portal");
        } finally {
            setIsLoadingPortal(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount / 100);
    };

    const getStatusBadge = (status: string) => {
        const statusLower = status.toLowerCase();
        let bgColor = "bg-n-3";
        let textColor = "text-n-7";

        if (statusLower === "active" || statusLower === "paid") {
            bgColor = "bg-green-500/20";
            textColor = "text-green-500";
        } else if (statusLower === "canceled" || statusLower === "failed") {
            bgColor = "bg-red-500/20";
            textColor = "text-red-500";
        } else if (statusLower === "trialing" || statusLower === "pending") {
            bgColor = "bg-yellow-500/20";
            textColor = "text-yellow-500";
        }

        return (
            <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
            >
                {status}
            </span>
        );
    };

    return (
        <Layout hideRightSidebar>
            <div className="p-10 md:pt-5 md:px-6 md:pb-10">
                <div className="mb-6 md:mb-3">
                    <div className="h3 leading-[4rem] md:mb-1 md:h3">
                        Billing & Subscription
                    </div>
                    <div className="body1 text-n-4 md:body1S">
                        Manage your subscription and view invoices
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div className="flex items-center">
                            <Icon className="fill-red-500 mr-3" name="close" />
                            <span className="text-red-500">{error}</span>
                        </div>
                    </div>
                )}

                {/* Subscription Section */}
                <div className="mb-8">
                    <div className="h5 mb-4">Current Subscription</div>
                    {subscriptionResult.success ? (
                        <div className="p-6 bg-n-2 dark:bg-n-7 rounded-xl border-2 border-transparent">
                            {subscriptionResult.data.subscription ? (
                                <>
                                    <div className="flex items-start justify-between mb-6 md:flex-col md:items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center mb-3">
                                                <div className="h4 capitalize mr-3">
                                                    {subscriptionResult.data.subscription.plan} Plan
                                                </div>
                                                {getStatusBadge(
                                                    subscriptionResult.data.subscription.status
                                                )}
                                            </div>
                                            <div className="space-y-2 text-n-4">
                                                <div className="flex items-center">
                                                    <Icon
                                                        className="fill-n-4 mr-2"
                                                        name="box"
                                                    />
                                                    <span>
                                                        Instance Limit:{" "}
                                                        {subscriptionResult.data.subscription.instanceLimit}
                                                    </span>
                                                </div>
                                                {subscriptionResult.data.subscription.currentPeriodEnd && (
                                                    <div className="flex items-center">
                                                        <Icon
                                                            className="fill-n-4 mr-2"
                                                            name="clock"
                                                        />
                                                        <span>
                                                            {subscriptionResult.data.subscription
                                                                .cancelAtPeriodEnd
                                                                ? "Ends on: "
                                                                : "Renews on: "}
                                                            {formatDate(
                                                                subscriptionResult.data.subscription.currentPeriodEnd
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-3 md:mt-4 md:w-full">
                                            <button
                                                className="btn-stroke-light md:flex-1"
                                                onClick={handleManageSubscription}
                                                disabled={isLoadingPortal}
                                            >
                                                {isLoadingPortal ? (
                                                    <>
                                                        <Icon name="clock" />
                                                        <span>Loading...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon name="settings" />
                                                        <span>Manage Subscription</span>
                                                    </>
                                                )}
                                            </button>
                                            {subscriptionResult.data.subscription.plan !== "enterprise" && (
                                                <Link
                                                    href="/pricing"
                                                    className="btn-blue md:flex-1"
                                                >
                                                    <Icon name="arrow-up" />
                                                    <span>Upgrade Plan</span>
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    {subscriptionResult.data.subscription.cancelAtPeriodEnd && (
                                        <div className="pt-4 border-t border-n-3 dark:border-n-6">
                                            <div className="flex items-center text-yellow-500">
                                                <Icon
                                                    className="fill-yellow-500 mr-2"
                                                    name="info-circle"
                                                />
                                                <span className="text-sm">
                                                    Your subscription will be canceled at the end of
                                                    the current billing period.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mb-4 mx-auto rounded-full bg-n-3 dark:bg-n-6 flex items-center justify-center">
                                        <Icon className="fill-n-4" name="box" />
                                    </div>
                                    <div className="h5 mb-2">No Active Subscription</div>
                                    <div className="body2 text-n-4 mb-6">
                                        Subscribe to a plan to start using FasterClaw
                                    </div>
                                    <Link href="/pricing" className="btn-blue">
                                        <Icon name="arrow-up" />
                                        <span>View Plans</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <div className="flex items-center text-red-500">
                                <Icon className="fill-red-500 mr-3" name="close" />
                                <span>Failed to load subscription: {subscriptionResult.error}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Invoice History Section */}
                <div>
                    <div className="h5 mb-4">Invoice History</div>
                    {invoicesResult.success ? (
                        invoicesResult.data.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-n-3 dark:border-n-6">
                                            <th className="text-left py-4 px-4 body2 font-semibold text-n-4">
                                                Date
                                            </th>
                                            <th className="text-left py-4 px-4 body2 font-semibold text-n-4">
                                                Amount
                                            </th>
                                            <th className="text-left py-4 px-4 body2 font-semibold text-n-4">
                                                Status
                                            </th>
                                            <th className="text-right py-4 px-4 body2 font-semibold text-n-4">
                                                Invoice
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoicesResult.data.map((invoice) => (
                                            <tr
                                                key={invoice.id}
                                                className="border-b border-n-3 dark:border-n-6 last:border-0"
                                            >
                                                <td className="py-4 px-4 body2">
                                                    {formatDate(invoice.createdAt)}
                                                </td>
                                                <td className="py-4 px-4 body2 font-semibold">
                                                    {formatAmount(invoice.amount)}
                                                </td>
                                                <td className="py-4 px-4">
                                                    {getStatusBadge(invoice.status)}
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    {invoice.invoicePdf ? (
                                                        <a
                                                            href={invoice.invoicePdf}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center text-primary-1 hover:text-primary-2 transition-colors"
                                                        >
                                                            <Icon
                                                                className="fill-current mr-2"
                                                                name="download"
                                                            />
                                                            <span className="body2">Download</span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-n-4 body2">
                                                            Not available
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-6 bg-n-2 dark:bg-n-7 rounded-xl text-center">
                                <div className="w-16 h-16 mb-4 mx-auto rounded-full bg-n-3 dark:bg-n-6 flex items-center justify-center">
                                    <Icon className="fill-n-4" name="card" />
                                </div>
                                <div className="h6 mb-2">No Invoices Yet</div>
                                <div className="body2 text-n-4">
                                    Your invoice history will appear here once you have an active
                                    subscription
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <div className="flex items-center text-red-500">
                                <Icon className="fill-red-500 mr-3" name="close" />
                                <span>Failed to load invoices: {invoicesResult.error}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default BillingContent;
