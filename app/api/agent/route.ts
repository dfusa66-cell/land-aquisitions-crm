import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadDashboardLeads } from "@/lib/leads-query";
import { answerPipelineQuestion, buildPipelineSnapshot } from "@/lib/pipeline-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para usar el Agente pipeline." }, { status: 401 });
  }

  let question = "";
  try {
    const body = (await request.json()) as { question?: unknown };
    question = String(body.question ?? "").trim().slice(0, 500);
  } catch {
    return NextResponse.json({ error: "Pregunta inválida." }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "Escribe una pregunta sobre el pipeline." }, { status: 400 });
  }

  const { data: leads, dbError } = await loadDashboardLeads();
  if (dbError) {
    return NextResponse.json({ error: dbError }, { status: 500 });
  }

  const answer = await answerPipelineQuestion(question, buildPipelineSnapshot(leads));
  return NextResponse.json(answer);
}
