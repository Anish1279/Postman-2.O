import { cookies } from "next/headers";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import type { WorkspaceLayout } from "@/lib/types";

const fallbackLayout: WorkspaceLayout = {
  horizontal: [23, 77],
  vertical: [56, 44]
};

function parseLayout(value?: string): WorkspaceLayout {
  if (!value) {
    return fallbackLayout;
  }

  try {
    const parsed = JSON.parse(value) as WorkspaceLayout;
    const hasHorizontal = Array.isArray(parsed.horizontal) && parsed.horizontal.length === 2;
    const hasVertical = Array.isArray(parsed.vertical) && parsed.vertical.length === 2;
    return hasHorizontal && hasVertical ? parsed : fallbackLayout;
  } catch {
    return fallbackLayout;
  }
}

export default async function Home() {
  const cookieStore = await cookies();
  const layout = parseLayout(cookieStore.get("postman-clone-layout")?.value);

  return <WorkspaceShell defaultLayout={layout} />;
}

