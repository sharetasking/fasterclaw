"use client";

import { useState } from "react";
import type { Instance } from "@fasterclaw/api-client";
import Layout from "@/components/Layout";
import Icon from "@/components/Icon";
import InstanceCard from "./InstanceCard";
import CreateInstanceModal from "./CreateInstanceModal";

type DashboardContentProps = {
    instances: Instance[];
};

const DashboardContent = ({ instances: initialInstances }: DashboardContentProps) => {
    const [instances, setInstances] = useState<Instance[]>(initialInstances);
    const [search, setSearch] = useState<string>("");
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

    const filteredInstances = instances.filter((instance) =>
        instance.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleInstanceCreated = (newInstance: Instance) => {
        setInstances((prev) => [...prev, newInstance]);
        setShowCreateModal(false);
    };

    const handleInstanceUpdated = (updatedInstance: Instance) => {
        setInstances((prev) =>
            prev.map((instance) =>
                instance.id === updatedInstance.id ? updatedInstance : instance
            )
        );
    };

    const handleInstanceDeleted = (deletedId: string) => {
        setInstances((prev) => prev.filter((instance) => instance.id !== deletedId));
    };

    return (
        <Layout hideRightSidebar>
            <div className="p-10 md:pt-5 md:px-6 md:pb-10">
                <div className="flex items-center justify-between mb-6 md:mb-3">
                    <div>
                        <div className="h3 leading-[4rem] md:mb-1 md:h3">
                            Instance Dashboard
                        </div>
                        <div className="body1 text-n-4 md:body1S">
                            Manage your FasterClaw instances
                        </div>
                    </div>
                    <button
                        className="btn-blue shrink-0 ml-6"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Icon name="plus" />
                        <span>Create Instance</span>
                    </button>
                </div>

                <form
                    className="mb-8"
                    action=""
                    onSubmit={(e) => {
                        e.preventDefault();
                    }}
                >
                    <div className="relative">
                        <button
                            className="group absolute top-5 left-5 outline-none"
                            type="submit"
                        >
                            <Icon
                                className="fill-n-4 transition-colors group-hover:fill-n-7"
                                name="search"
                            />
                        </button>
                        <input
                            className="w-full h-16 pl-13 pr-6 bg-n-2 border-2 border-transparent rounded-xl outline-none base1 text-n-7 transition-colors placeholder:text-n-4 focus:border-n-3 focus:bg-transparent dark:bg-n-7 dark:text-n-1 dark:focus:bg-n-6 dark:focus:border-n-7"
                            type="text"
                            name="search"
                            placeholder="Search instances by name"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </form>

                {filteredInstances.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 mb-6 rounded-full bg-n-3 dark:bg-n-6 flex items-center justify-center">
                            <Icon className="fill-n-4" name="box" />
                        </div>
                        <div className="h5 mb-2">No instances found</div>
                        <div className="body2 text-n-4 mb-8">
                            {search
                                ? "Try adjusting your search terms"
                                : "Get started by creating your first instance"}
                        </div>
                        {!search && (
                            <button
                                className="btn-blue"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <Icon name="plus" />
                                <span>Create Instance</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="mb-6 h6 text-n-4">
                            {filteredInstances.length}{" "}
                            {filteredInstances.length === 1 ? "Instance" : "Instances"}
                        </div>
                        <div className="flex flex-wrap -mx-7 -mt-16 2xl:-mx-4 2xl:-mt-12 md:block md:mt-0 md:mx-0">
                            {filteredInstances.map((instance) => (
                                <InstanceCard
                                    key={instance.id}
                                    instance={instance}
                                    onUpdate={handleInstanceUpdated}
                                    onDelete={handleInstanceDeleted}
                                />
                            ))}
                        </div>
                    </>
                )}

                {showCreateModal && (
                    <CreateInstanceModal
                        onClose={() => setShowCreateModal(false)}
                        onCreate={handleInstanceCreated}
                    />
                )}
            </div>
        </Layout>
    );
};

export default DashboardContent;
