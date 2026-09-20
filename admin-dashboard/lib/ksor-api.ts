/**
 * KSoR API client for the admin dashboard.
 *
 * In production, this would call the KSoR MCP server directly.
 * For now, it reads from the filesystem via a local API route.
 */

export interface KSoRDocument {
  slug: string;
  title: string;
  description: string;
  status: "draft" | "stable" | "deprecated";
  audience: string[];
  owner?: string;
  approval?: { by: string; at: string };
  generated?: { by: string; at: string };
  content: string;
}

export interface KSoRSearchResult {
  abstained: boolean;
  hits: Array<{
    slug: string;
    content: string;
    rrf_score: number;
    provenance: { stable_id: string };
  }>;
}

const KSOR_MCP_URL = process.env.NEXT_PUBLIC_KSOR_MCP_URL || "http://127.0.0.1:8080/mcp";

async function mcpCall(method: string, params: Record<string, unknown>) {
  const response = await fetch(KSOR_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params,
    }),
  });

  const text = await response.text();
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      const data = JSON.parse(line.slice(6));
      return data.result;
    }
  }
  return null;
}

export async function searchKnowledge(query: string, k = 5): Promise<KSoRSearchResult> {
  return mcpCall("search", { name: "search", arguments: { query, k } });
}

export async function readDocument(slug: string): Promise<{ content: string } | null> {
  return mcpCall("read", { name: "read", arguments: { slug } });
}

export async function outlineKnowledge(node?: string) {
  return mcpCall("outline", { name: "outline", arguments: { node, depth: 2 } });
}

/**
 * Trigger ksor build and refresh via the local dev server.
 * In production, this would be an API call to the deployment pipeline.
 */
export async function triggerRefresh(): Promise<{ success: boolean; message: string }> {
  // This would call an API endpoint that runs `npm run refresh`
  // For now, return a placeholder
  return { success: true, message: "Refresh triggered (dev mode)" };
}
