import type { NextPage } from "next";
import { getSubscription, getInvoices } from "@/actions/billing.actions";
import BillingContent from "./BillingContent";

const BillingPage: NextPage = async () => {
    const [subscriptionResult, invoicesResult] = await Promise.all([
        getSubscription(),
        getInvoices(),
    ]);

    return (
        <BillingContent
            subscriptionResult={subscriptionResult}
            invoicesResult={invoicesResult}
        />
    );
};

export default BillingPage;
