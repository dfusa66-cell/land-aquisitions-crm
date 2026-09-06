export const PIPELINE_STAGES = [
  "LEAD_SC",
  "PRECIO_ASK",
  "UNDERWRITTEN",
  "OFERTA_ENVIADA",
  "NEGOCIACION",
  "READY_TO_CLOSE",
  "CERRADO",
  "DEAD"
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_LABELS: Record<PipelineStage, string> = {
  LEAD_SC: "Lead SC",
  PRECIO_ASK: "Precio/Ask",
  UNDERWRITTEN: "Underwritten",
  OFERTA_ENVIADA: "Oferta enviada",
  NEGOCIACION: "Negociación",
  READY_TO_CLOSE: "Ready to close",
  CERRADO: "Cerrado",
  DEAD: "Dead"
};

export const PIPELINE_HINTS: Record<PipelineStage, string> = {
  LEAD_SC: "New SmarterContact / inbound land lead",
  PRECIO_ASK: "Seller named a price or we are asking for one",
  UNDERWRITTEN: "ARV, Land Portal, and offer math are in",
  OFERTA_ENVIADA: "40% / 50% offer has been sent",
  NEGOCIACION: "Countering toward a buyable number",
  READY_TO_CLOSE: "Terms agreed, heading to closing",
  CERRADO: "Purchased or flipped this month",
  DEAD: "DNC, wrong number, or no deal"
};

export const ACTIVE_PIPELINE_STAGES: PipelineStage[] = PIPELINE_STAGES.filter(
  (stage) => stage !== "CERRADO" && stage !== "DEAD"
);

const STAGE_SET = new Set<string>(PIPELINE_STAGES);

export function isPipelineStage(value: string | null | undefined): value is PipelineStage {
  return !!value && STAGE_SET.has(value);
}

export function inferPipelineStage(status: string, askingPrice?: number | null): PipelineStage {
  if (status === "DNC" || status === "WRONG_NUMBER" || status === "COLD") return "DEAD";
  if (askingPrice != null || status === "HOT") return "PRECIO_ASK";
  return "LEAD_SC";
}

export function resolvePipelineStage(lead: {
  pipelineStage?: string | null;
  status: string;
  askingPrice?: number | null;
}): PipelineStage {
  if (isPipelineStage(lead.pipelineStage)) {
    if (lead.pipelineStage === "LEAD_SC" && (lead.status === "DNC" || lead.status === "WRONG_NUMBER")) {
      return "DEAD";
    }
    return lead.pipelineStage;
  }
  return inferPipelineStage(lead.status, lead.askingPrice);
}

export function nextPipelineStageOnImport(input: {
  status: string;
  askingPrice?: number | null;
  existingStage?: string | null;
}): PipelineStage {
  const existing = isPipelineStage(input.existingStage) ? input.existingStage : null;
  if (existing && existing !== "LEAD_SC" && existing !== "DEAD") return existing;
  return inferPipelineStage(input.status, input.askingPrice);
}
