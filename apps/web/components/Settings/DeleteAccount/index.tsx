"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/actions/auth.actions";

type DeleteAccountProps = {};

const DeleteAccount = ({}: DeleteAccountProps) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!showConfirmation) {
            setShowConfirmation(true);
            return;
        }

        setError("");
        setLoading(true);

        try {
            const result = await deleteAccount();

            if (result.success) {
                // Redirect to sign-in page after successful deletion
                router.push("/sign-in");
            } else {
                setError(result.error || "Failed to delete account");
                setLoading(false);
            }
        } catch (err) {
            setError("An unexpected error occurred");
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setShowConfirmation(false);
        setError("");
    };

    return (
        <form className="" action="" onSubmit={handleSubmit}>
            <div className="mb-8 h4">We're sorry to see you go</div>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="mb-6 caption1 text-n-4">
                Warning: Deleting your account will permanently remove all of
                your data and cannot be undone. This includes your profile,
                chats, comments, and any other information associated with your
                account. Are you sure you want to proceed with deleting your
                account?
            </div>

            {showConfirmation && (
                <div className="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-2 border-yellow-400">
                    <div className="font-semibold mb-2">Final Confirmation</div>
                    <div>
                        This action is irreversible. Click "Delete account" again to confirm.
                    </div>
                </div>
            )}

            <div className="flex gap-3">
                {showConfirmation && (
                    <button
                        type="button"
                        className="btn-stroke-light flex-1"
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                )}
                <button
                    className={`btn-red ${showConfirmation ? 'flex-1' : 'w-full'}`}
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Deleting account..." : "Delete account"}
                </button>
            </div>
        </form>
    );
};

export default DeleteAccount;
