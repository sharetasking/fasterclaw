import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const integrations = [
  {
    slug: "google-workspace",
    name: "Google Workspace",
    description:
      "Connect to Gmail, Google Calendar, and Google Drive for email, scheduling, and file management",
    category: "productivity",
    iconUrl: "🔵",
    provider: "google",
    authType: "oauth2",
    oauthScopes: [
      // Required for user identification
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      // Gmail
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      // Calendar
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  },
  {
    slug: "slack",
    name: "Slack",
    description:
      "Post messages, manage channels, and interact with your Slack workspace",
    category: "communication",
    iconUrl: "💬",
    provider: "slack",
    authType: "oauth2",
    oauthScopes: [
      // Messaging
      "chat:write",
      "assistant:write",
      // Channels (public)
      "channels:read",
      "channels:history",
      "channels:join",
      // Groups (private channels)
      "groups:read",
      "groups:history",
      // Direct messages
      "im:history",
      "im:read",
      // Users & files
      "users:read",
      "usergroups:read",
      "files:read",
      // App mentions
      "app_mentions:read",
    ],
  },
  {
    slug: "github",
    name: "GitHub",
    description:
      "Manage repositories, issues, pull requests, and workflows on GitHub",
    category: "development",
    iconUrl: "🐙",
    provider: "github",
    authType: "oauth2",
    oauthScopes: ["repo", "workflow", "read:org"],
  },
];

async function seedIntegrations() {
  console.log("🌱 Seeding integrations...");

  for (const integration of integrations) {
    await prisma.integration.upsert({
      where: { slug: integration.slug },
      update: integration,
      create: integration,
    });
    console.log(`  ✓ ${integration.name}`);
  }

  console.log("✅ Integrations seeded successfully!");
}

seedIntegrations()
  .catch((e) => {
    console.error("❌ Error seeding integrations:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
