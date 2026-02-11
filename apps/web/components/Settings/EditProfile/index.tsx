"use client";

import { useState, useEffect } from "react";
import Image from "@/components/Image";
import Icon from "@/components/Icon";
import Field from "@/components/Field";
import { updateProfile, getCurrentUser } from "@/actions/auth.actions";
import type { User } from "@fasterclaw/api-client";

type EditProfileProps = {};

const EditProfile = ({}: EditProfileProps) => {
    const [objectURL, setObjectURL] = useState<any>("/images/avatar.jpg");
    const [name, setName] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");
    const [initialLoading, setInitialLoading] = useState<boolean>(true);

    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                const user = await getCurrentUser();
                if (user) {
                    setName(user.name || "");
                }
            } catch (err) {
                console.error("Failed to load user:", err);
            } finally {
                setInitialLoading(false);
            }
        };

        loadCurrentUser();
    }, []);

    const handleUpload = (e: any) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // setImage(file);
            setObjectURL(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const result = await updateProfile(name);

            if (result.success) {
                setSuccess("Profile updated successfully!");
            } else {
                setError(result.error || "Failed to update profile");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="text-n-4">Loading...</div>
            </div>
        );
    }

    return (
        <form className="" action="" onSubmit={handleSubmit}>
            <div className="mb-8 h4 md:mb-6">Edit profile</div>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                    {success}
                </div>
            )}

            <div className="mb-3 base2 font-semibold text-n-6 dark:text-n-1">
                Avatar
            </div>
            <div className="flex items-center mb-6">
                <div className="relative flex justify-center items-center shrink-0 w-28 h-28 mr-4 rounded-full overflow-hidden bg-n-2 dark:bg-n-6">
                    {objectURL !== null ? (
                        <Image
                            className="object-cover rounded-full"
                            src={objectURL}
                            fill
                            alt="Avatar"
                        />
                    ) : (
                        <Icon
                            className="w-8 h-8 dark:fill-n-1"
                            name="profile"
                        />
                    )}
                </div>
                <div className="grow">
                    <div className="relative inline-flex mb-4">
                        <input
                            className="peer absolute inset-0 opacity-0 cursor-pointer"
                            type="file"
                            onChange={handleUpload}
                            disabled
                        />
                        <button
                            type="button"
                            className="btn-stroke-light peer-hover:bg-n-3 dark:peer-hover:bg-n-5 opacity-50 cursor-not-allowed"
                            disabled
                        >
                            Upload new image
                        </button>
                    </div>
                    <div className="caption1 text-n-4">
                        <p>Avatar upload not yet supported.</p>
                    </div>
                </div>
            </div>
            <Field
                className="mb-6"
                label="Name"
                placeholder="Username"
                icon="profile-1"
                value={name}
                onChange={(e: any) => setName(e.target.value)}
                required
                disabled={loading}
            />
            <button
                className="btn-blue w-full"
                type="submit"
                disabled={loading}
            >
                {loading ? "Saving..." : "Save changes"}
            </button>
        </form>
    );
};

export default EditProfile;
