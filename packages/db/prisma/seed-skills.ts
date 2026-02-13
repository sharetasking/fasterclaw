import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const skills = [
  {
    slug: "github-cli",
    name: "GitHub CLI",
    description:
      "Interact with GitHub using the gh CLI. Manage issues, PRs, workflows, and more.",
    category: "development",
    iconUrl: "🐙",
    requiresBins: ["gh"],
    requiresEnvVars: [],
    compatibleOs: ["linux", "darwin", "windows"],
    markdownContent: `---
name: github-cli
description: "Interact with GitHub using the gh CLI"
metadata:
  openclaw:
    emoji: "🐙"
    requires:
      bins: ["gh"]
---

# GitHub CLI Skill

Use the \`gh\` CLI to interact with GitHub. Always specify \`--repo owner/repo\` when not in a git directory.

## Pull Requests

Check CI status on a PR:
\`\`\`bash
gh pr checks 55 --repo owner/repo
\`\`\`

List recent PRs:
\`\`\`bash
gh pr list --repo owner/repo --limit 10
\`\`\`

## Issues

Create an issue:
\`\`\`bash
gh issue create --repo owner/repo --title "Bug report" --body "Description"
\`\`\`

List issues:
\`\`\`bash
gh issue list --repo owner/repo
\`\`\`

## Workflows

View workflow runs:
\`\`\`bash
gh run list --repo owner/repo --limit 10
\`\`\`

View logs for a run:
\`\`\`bash
gh run view <run-id> --repo owner/repo --log-failed
\`\`\`
`,
  },
  {
    slug: "gmail-integration",
    name: "Gmail Integration",
    description: "Send and read emails using Gmail API",
    category: "productivity",
    iconUrl: "📧",
    requiresBins: [],
    requiresEnvVars: ["GOOGLE_OAUTH_TOKEN"],
    compatibleOs: ["linux", "darwin", "windows"],
    markdownContent: `---
name: gmail-integration
description: "Send and read emails using Gmail API"
metadata:
  openclaw:
    emoji: "📧"
    requires:
      env: ["GOOGLE_OAUTH_TOKEN"]
---

# Gmail Integration Skill

Access Gmail to read, send, and manage emails.

## Reading Emails

When the user asks to check email:
1. List recent messages
2. Filter by sender, subject, or date
3. Mark as read/unread

## Sending Emails

To send an email:
1. Ask for recipient, subject, and body
2. Request confirmation before sending
3. Send via Gmail API using GOOGLE_OAUTH_TOKEN

## Best Practices

- Always ask for confirmation before sending emails
- Respect user privacy - don't log email content
- Use threading for reply chains
`,
  },
  {
    slug: "slack-notifications",
    name: "Slack Notifications",
    description: "Post messages and notifications to Slack channels",
    category: "communication",
    iconUrl: "💬",
    requiresBins: [],
    requiresEnvVars: ["SLACK_OAUTH_TOKEN"],
    compatibleOs: ["linux", "darwin", "windows"],
    markdownContent: `---
name: slack-notifications
description: "Post messages to Slack channels"
metadata:
  openclaw:
    emoji: "💬"
    requires:
      env: ["SLACK_OAUTH_TOKEN"]
---

# Slack Notifications Skill

Send messages and notifications to Slack workspaces.

## Sending Messages

Post to a channel:
\`\`\`
POST to Slack API: chat.postMessage
channel: #general
text: "Your message here"
\`\`\`

## Channels

List available channels and select the appropriate one.

## Formatting

Use Slack's mrkdwn format for rich text:
- **bold**
- _italic_
- \`code\`
- > quotes
`,
  },
  {
    slug: "calendar-management",
    name: "Calendar Management",
    description: "Manage Google Calendar events and schedules",
    category: "productivity",
    iconUrl: "📅",
    requiresBins: [],
    requiresEnvVars: ["GOOGLE_OAUTH_TOKEN"],
    compatibleOs: ["linux", "darwin", "windows"],
    markdownContent: `---
name: calendar-management
description: "Manage Google Calendar events"
metadata:
  openclaw:
    emoji: "📅"
    requires:
      env: ["GOOGLE_OAUTH_TOKEN"]
---

# Calendar Management Skill

Create, view, and manage Google Calendar events.

## Viewing Events

List upcoming events:
- Today's schedule
- This week's meetings
- Specific date ranges

## Creating Events

When creating an event:
1. Get title, date, time, duration
2. Optional: add attendees, location, description
3. Confirm with user before creating

## Modifying Events

- Update event details
- Cancel events
- Invite additional attendees
`,
  },
  {
    slug: "file-operations",
    name: "File Operations",
    description: "Read, write, and manage files on the system",
    category: "development",
    iconUrl: "📁",
    requiresBins: ["cat", "ls", "grep"],
    requiresEnvVars: [],
    compatibleOs: ["linux", "darwin"],
    markdownContent: `---
name: file-operations
description: "Read, write, and manage files"
metadata:
  openclaw:
    emoji: "📁"
    requires:
      bins: ["cat", "ls", "grep"]
---

# File Operations Skill

Interact with files and directories.

## Reading Files

Use \`cat\` to read file contents:
\`\`\`bash
cat path/to/file.txt
\`\`\`

## Searching

Search file contents:
\`\`\`bash
grep "search term" path/to/file.txt
\`\`\`

Find files:
\`\`\`bash
find . -name "*.txt"
\`\`\`

## Listing

List directory contents:
\`\`\`bash
ls -la /path/to/directory
\`\`\`
`,
  },
];

async function seedSkills() {
  console.log("🌱 Seeding skills...");

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: skill,
      create: skill,
    });
    console.log(`  ✓ ${skill.name}`);
  }

  console.log("✅ Skills seeded successfully!");
}

seedSkills()
  .catch((e) => {
    console.error("❌ Error seeding skills:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
