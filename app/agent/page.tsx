import { DbStatusBanner } from "@/components/db-status-banner";
import { MainSidebar, MobileNav } from "@/components/leads/main-sidebar";
import { PipelineAgentChat } from "@/components/agent/pipeline-agent-chat";
import { requireUser } from "@/lib/auth";
import { loadDashboardLeads } from "@/lib/leads-query";
import { buildPipelineSnapshot, hasOpenAiKey } from "@/lib/pipeline-agent";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  await requireUser();
  const { data: leads, schemaDrift, dbError } = await loadDashboardLeads();
  const snapshot = buildPipelineSnapshot(leads);

  return (
    <main className="flex min-h-screen bg-[#f4f6f2] text-[#172026]">
      <MainSidebar />
      <section className="min-w-0 flex-1">
        <MobileNav />
        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-moss">Sell Your Land to Diego</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Agente pipeline</h1>
            <p className="text-sm text-slate-500">
              Pregunta en español o inglés. Las respuestas salen de leads reales en Prisma — no inventa deals, precios ni etapas.
            </p>
          </div>
          <DbStatusBanner schemaDrift={schemaDrift} dbError={dbError} />
          <PipelineAgentChat snapshot={snapshot} engineReady={hasOpenAiKey() ? "openai" : "rules"} />
        </div>
      </section>
    </main>
  );
}
