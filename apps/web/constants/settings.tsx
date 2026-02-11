export const settings = [
    {
        id: "edit-profile",
        title: "Edit profile",
        icon: "profile",
        devOnly: false,
    },
    {
        id: "password",
        title: "Password",
        icon: "lock-1",
        devOnly: false,
    },
    {
        id: "notifications",
        title: "Notifications",
        icon: "bell",
        devOnly: true, // Hidden in production - for future use
    },
    {
        id: "chat-export",
        title: "Chat export",
        icon: "download-fill",
        devOnly: true, // Hidden in production - for future use
    },
    {
        id: "sessions",
        title: "Sessions",
        icon: "log-in",
        devOnly: true, // Hidden in production - for future use
    },
    {
        id: "applications",
        title: "Applications",
        icon: "container",
        devOnly: true, // Hidden in production - for future use
    },
    {
        id: "team",
        title: "Team",
        icon: "users-plus",
        devOnly: true, // Hidden in production - for future use
    },
    {
        id: "appearance",
        title: "Appearance",
        icon: "sun",
        devOnly: false,
    },
    {
        id: "delete-account",
        title: "Delete account",
        icon: "close-fat",
        devOnly: false,
    },
];

// Helper to get visible settings based on environment
export const getVisibleSettings = () => {
    if (process.env.NODE_ENV === "development") {
        return settings;
    }
    return settings.filter((setting) => !setting.devOnly);
};
