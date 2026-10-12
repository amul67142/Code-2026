import { getConnections, getDeliveryLogs } from "./actions";
import { getProjects } from "../../projects/actions";
import ConnectionsClient from "./connections-client";

export const metadata = {
  title: "Connections | Big Lead CRM",
};

// Live integration state behind auth cookies — never prerender.
export const dynamic = "force-dynamic";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    // Next.js control-flow errors must keep propagating.
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest?: string }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_")
    ) {
      throw e;
    }
    if (e instanceof Error && e.message.includes("Dynamic server usage")) throw e;
    console.error("Connections page: sub-fetch failed (rendering fallback):", e);
    return fallback;
  }
}

export default async function ConnectionsPage() {
  const [connections, projects, logs] = await Promise.all([
    safe(getConnections(), [] as Awaited<ReturnType<typeof getConnections>>),
    safe(getProjects(), []),
    safe(getDeliveryLogs(undefined, 50), [] as Awaited<ReturnType<typeof getDeliveryLogs>>),
  ]);

  return (
    <ConnectionsClient
      initialConnections={connections}
      projects={projects}
      initialLogs={logs}
    />
  );
}
