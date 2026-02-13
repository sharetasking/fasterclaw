"use client";

import Layout from "@/components/Layout";
import Main from "./Main";
import type { Instance } from "@fasterclaw/api-client";

interface HomePageProps {
    instance?: Instance | null;
}

const HomePage = ({ instance }: HomePageProps) => {
    return (
        <Layout>
            <Main instance={instance ?? null} />
        </Layout>
    );
};

export default HomePage;
