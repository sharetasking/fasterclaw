"use client";

import { useState } from "react";
import Field from "@/components/Field";
import { updatePassword } from "@/actions/auth.actions";

type PasswordProps = {};

const Password = ({}: PasswordProps) => {
    const [oldPassword, setOldPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        // Validate password length
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        setLoading(true);

        try {
            const result = await updatePassword(oldPassword, newPassword);

            if (result.success) {
                setSuccess("Password updated successfully!");
                // Clear form
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                setError(result.error || "Failed to update password");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="" action="" onSubmit={handleSubmit}>
            <div className="mb-8 h4 md:mb-6">Password</div>

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

            <Field
                className="mb-6"
                label="Current password"
                placeholder="Current password"
                type="password"
                icon="lock"
                value={oldPassword}
                onChange={(e: any) => setOldPassword(e.target.value)}
                required
                disabled={loading}
            />
            <Field
                className="mb-6"
                label="New password"
                placeholder="New password"
                note="Minimum 8 characters"
                type="password"
                icon="lock"
                value={newPassword}
                onChange={(e: any) => setNewPassword(e.target.value)}
                required
                disabled={loading}
            />
            <Field
                className="mb-6"
                label="Confirm new password"
                placeholder="Confirm new password"
                note="Minimum 8 characters"
                type="password"
                icon="lock"
                value={confirmPassword}
                onChange={(e: any) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
            />
            <button
                className="btn-blue w-full"
                type="submit"
                disabled={loading}
            >
                {loading ? "Changing password..." : "Change password"}
            </button>
        </form>
    );
};

export default Password;
