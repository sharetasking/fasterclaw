import type { NextPage } from "next";
import { getInstances } from "@/actions/instances.actions";
import DashboardContent from "./DashboardContent";

const Dashboard: NextPage = async () => {
    const instances = await getInstances();

    return <DashboardContent instances={instances} />;
};

export default Dashboard;
