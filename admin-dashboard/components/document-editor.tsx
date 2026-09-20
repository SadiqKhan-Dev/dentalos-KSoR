"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextareaAutosize from "react-textarea-autosize";

interface DocumentEditorProps {
  slug?: string;
  initialContent?: string;
  initialFrontmatter?: Record<string, unknown>;
}

export default function DocumentEditor({
  slug,
  initialContent = "",
  initialFrontmatter = {},
}: DocumentEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState((initialFrontmatter.title as string) || "");
  const [description, setDescription] = useState((initialFrontmatter.description as string) || "");
  const [audience, setAudience] = useState<string[]>(
    (initialFrontmatter.audience as string[]) || ["public"]
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"draft" | "review">("draft");

  const handleSave = async () => {
    setSaving(true);

    // Build frontmatter
    const frontmatter = [
      "---",
      "type: Document",
      `title: "${title}"`,
      `description: "${description}"`,
      `status: ${status}`,
      "ksor:",
      `  audience: [${audience.join(", ")}]`,
      `  owner: human:${status === "review" ? "platform-admin" : "draft"}`,
      "---",
      "",
    ].join("\n");

    const fullContent = frontmatter + content;

    // In production, this would call an API to save the file
    // For now, log to console
    console.log("Saving document:", slug || "new");
    console.log("Content:", fullContent);

    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSaving(false);
    router.push("/dashboard/knowledge");
  };

  const handleApprove = async () => {
    setSaving(true);

    // In production, this would:
    // 1. Update status to stable
    // 2. Add approval metadata
    // 3. Trigger ksor build and refresh
    console.log("Approving document:", slug);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSaving(false);
    router.push("/dashboard/knowledge");
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Document title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="One sentence description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Audience</label>
        <div className="mt-1 flex items-center space-x-4">
          {["public", "staff"].map((a) => (
            <label key={a} className="inline-flex items-center">
              <input
                type="checkbox"
                checked={audience.includes(a)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setAudience([...audience, a]);
                  } else {
                    setAudience(audience.filter((x) => x !== a));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{a}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Content (Markdown)</label>
        <TextareaAutosize
          minRows={15}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          placeholder="Write your document content here..."
        />
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={handleSave}
          disabled={saving || !title}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save as Draft"}
        </button>
        <button
          onClick={handleApprove}
          disabled={saving || !title || !content}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Submit for Approval"}
        </button>
      </div>
    </div>
  );
}
