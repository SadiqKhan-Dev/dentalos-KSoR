import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug: slugParts } = await params;
  const slug = slugParts.join("/");

  // Check if user is authorized to approve
  // In production, check against governance.yaml approval_authorities
  const isAdmin = isPlatformAdmin(userId);

  if (!isAdmin) {
    return NextResponse.json(
      { error: "Not authorized to approve documents" },
      { status: 403 }
    );
  }

  // In production, this would:
  // 1. Update the document's status to "stable"
  // 2. Add ksor.approval metadata
  // 3. Trigger `ksor build` and `npm run refresh`
  console.log(`Approving document: ${slug} by ${userId}`);

  // Simulate approval
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({
    success: true,
    message: `Document ${slug} approved and published`,
    approved_by: userId,
    approved_at: new Date().toISOString(),
  });
}
