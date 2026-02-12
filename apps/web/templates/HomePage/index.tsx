"use client";

import Layout from "@/components/Layout";
import Main from "./Main";

type HomePageProps = {
    instance?: any | null;
};

const HomePage = ({ instance }: HomePageProps) => {
    return (
        <Layout>
            <Main instance={instance ?? null} />
        </Layout>
    );
};

export default HomePage;
