import { notFound } from "next/navigation";
import DocumentEditor from "@/components/document-editor";

// Mock document data; in production, fetch from KSoR
const MOCK_DOCS: Record<string, { title: string; description: string; audience: string[]; content: string }> = {
  "smile-care-karachi/booking-policy": {
    title: "Booking Policy",
    description: "Hours of operation, appointment vs. walk-in availability, and cancellation rules.",
    audience: ["public"],
    content: `## Hours of operation\n\nSmile Care Karachi is open Saturday through Thursday, 9:00 AM to 9:00 PM PKT.\n\n## Cancellation and rescheduling\n\n- **24-hour notice** is required for cancellation or rescheduling without a fee.\n- Cancellations made fewer than 24 hours before the appointment may incur a **PKR 500 no-show fee**.`,
  },
};

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function EditDocumentPage({ params }: PageProps) {
  const { slug: slugParts } = await params;
  const slug = slugParts.join("/");
  const doc = MOCK_DOCS[slug];

  if (!doc) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Document</h1>
      <p className="text-sm text-gray-500 mb-6">Slug: {slug}</p>
      <DocumentEditor
        slug={slug}
        initialContent={doc.content}
        initialFrontmatter={{
          title: doc.title,
          description: doc.description,
          audience: doc.audience,
        }}
      />
    </div>
  );
}
