import { Octokit } from "@octokit/rest";

// --- 1. TOOL DEFINITIONS (Schema) ---
export const tools = [
  {
    name: "github_search_issues",
    description:
      "Search for issues and pull requests across GitHub repositories using standard search syntax.",
    parameters: {
      type: "OBJECT",
      properties: {
        q: {
          type: "STRING",
          description:
            "Search query (e.g. 'repo:owner/name is:issue is:open bug').",
        },
        sort: {
          type: "STRING",
          description: "Sort field (comments, created, updated).",
        },
        order: {
          type: "STRING",
          enum: ["asc", "desc"],
          description: "Sort order.",
        },
      },
      required: ["q"],
    },
  },
  {
    name: "github_create_issue",
    description: "Create a new issue in a GitHub repository.",
    parameters: {
      type: "OBJECT",
      properties: {
        owner: { type: "STRING", description: "Repository owner." },
        repo: { type: "STRING", description: "Repository name." },
        title: { type: "STRING", description: "Issue title." },
        body: { type: "STRING", description: "Issue body content." },
        assignees: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Usernames to assign.",
        },
        labels: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Labels to apply.",
        },
      },
      required: ["owner", "repo", "title"],
    },
  },
  {
    name: "github_get_issue",
    description: "Get details of a specific issue.",
    parameters: {
      type: "OBJECT",
      properties: {
        owner: { type: "STRING" },
        repo: { type: "STRING" },
        issue_number: { type: "NUMBER" },
      },
      required: ["owner", "repo", "issue_number"],
    },
  },
  {
    name: "github_list_pull_requests",
    description: "List pull requests in a repository.",
    parameters: {
      type: "OBJECT",
      properties: {
        owner: { type: "STRING" },
        repo: { type: "STRING" },
        state: {
          type: "STRING",
          enum: ["open", "closed", "all"],
          description: "PR state filter.",
        },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "github_create_pull_request",
    description: "Create a new Pull Request.",
    parameters: {
      type: "OBJECT",
      properties: {
        owner: { type: "STRING" },
        repo: { type: "STRING" },
        title: { type: "STRING" },
        head: {
          type: "STRING",
          description:
            "The name of the branch where your changes are implemented.",
        },
        base: {
          type: "STRING",
          description:
            "The name of the branch you want the changes pulled into.",
        },
        body: { type: "STRING", description: "Description of the PR." },
      },
      required: ["owner", "repo", "title", "head", "base"],
    },
  },
];

// --- 2. HANDLER IMPLEMENTATION ---

// Helper to get authenticated client
function getClient() {
  // In "Vampire Mode", we access the environment directly
  // Future improvement: Use CredentialVault.retrieve('github')
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is missing from environment. Please set it in .env"
    );
  }
  return new Octokit({ auth: token });
}

export async function handler(toolName: string, args: any) {
  const octokit = getClient();
  console.log(`[GITHUB-PLUGIN] Executing ${toolName}...`);

  try {
    switch (toolName) {
      case "github_search_issues":
        const searchRes = await octokit.search.issuesAndPullRequests({
          q: args.q,
          sort: args.sort as any,
          order: args.order as any,
        });
        return {
          count: searchRes.data.total_count,
          items: searchRes.data.items.map((item) => ({
            number: item.number,
            title: item.title,
            state: item.state,
            url: item.html_url,
          })),
        };

      case "github_create_issue":
        const createRes = await octokit.issues.create({
          owner: args.owner,
          repo: args.repo,
          title: args.title,
          body: args.body,
          assignees: args.assignees,
          labels: args.labels,
        });
        return {
          success: true,
          number: createRes.data.number,
          url: createRes.data.html_url,
        };

      case "github_get_issue":
        const getRes = await octokit.issues.get({
          owner: args.owner,
          repo: args.repo,
          issue_number: args.issue_number,
        });
        return {
          title: getRes.data.title,
          body: getRes.data.body,
          state: getRes.data.state,
          comments: getRes.data.comments,
        };

      case "github_list_pull_requests":
        const listPrs = await octokit.pulls.list({
          owner: args.owner,
          repo: args.repo,
          state: (args.state as any) || "open",
        });
        return listPrs.data.map((pr) => ({
          number: pr.number,
          title: pr.title,
          user: pr.user?.login,
          url: pr.html_url,
        }));

      case "github_create_pull_request":
        const createPr = await octokit.pulls.create({
          owner: args.owner,
          repo: args.repo,
          title: args.title,
          head: args.head,
          base: args.base,
          body: args.body,
        });
        return {
          success: true,
          number: createPr.data.number,
          url: createPr.data.html_url,
        };

      default:
        throw new Error(`Tool ${toolName} not implemented in GitHub plugin.`);
    }
  } catch (error: any) {
    console.error(`[GITHUB-PLUGIN] Error:`, error);
    // Return structured error for the LLM
    return {
      error: true,
      message: error.message || "Unknown GitHub API error",
      details: error.response?.data || null,
    };
  }
}
