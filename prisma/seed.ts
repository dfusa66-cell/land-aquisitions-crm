import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";
import { importLead } from "../lib/import-lead";

async function main() {
  await prisma.user.upsert({
    where: { email: "diego@example.com" },
    update: {},
    create: { email: "diego@example.com", name: "Diego", passwordHash: await hash("demo1234", 10) }
  });
  await prisma.businessMetrics.upsert({
    where: { id: "default" },
    update: {
      netProfitAllTime: 207090,
      landProfitClosed: 182000,
      coachingIncome: 25000,
      affiliateIncome: 18090,
      marketingSpend: 18000,
      pipelineProjected: 26000,
      note: "Aug 2025–Sep 2026 · SC 7000 · Land Portal 11090"
    },
    create: {
      id: "default",
      netProfitAllTime: 207090,
      landProfitClosed: 182000,
      coachingIncome: 25000,
      affiliateIncome: 18090,
      marketingSpend: 18000,
      pipelineProjected: 26000,
      note: "Aug 2025–Sep 2026 · SC 7000 · Land Portal 11090"
    }
  });
  await prisma.negotiationSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      negotiationStyle: "Short, natural SMS. Be respectful, direct, and conversational.",
      generalRules: "Use direction metadata to identify speaker. DNC overrides all classifications.",
      mustNeverSay: "Do not accept offers, make guarantees, or claim property research that is not in the CRM.",
      preferredQuestions: "Do you have a number in mind? Is that pretty firm? What made you think about selling?",
      offerStrategy: "Do not exceed MAO. Escalate any suggested reply that could create a financial commitment."
    }
  });
  const leads = [
    ["Marta", "Reyes", "505-555-0141", "40", "Valencia", "NM", "101-22-003", ["Hi Marta, would you consider selling your 40 acres in Valencia County?", "Depends on the price.", "Do you have a number in mind?", "$35,000 and I would sign."], ["sent", "received", "sent", "received"]],
    ["Caleb", "Moore", "928-555-0177", "10", "Coconino", "AZ", "300-44-812", ["Hi Caleb, checking if you would sell your land.", "Maybe. What are you offering?", "I need to review the parcel first. Any price range?", "Not sure yet."], ["sent", "received", "sent", "received"]],
    ["Rina", "Patel", "806-555-0180", "5", "Hudspeth", "TX", "77-204-19", ["Would you consider selling your 5 acres?", "Possibly, but text me next month.", "No problem, I can follow up then."], ["sent", "received", "sent"]],
    ["Bruce", "Ng", "702-555-0102", "2.5", "Nye", "NV", "009-891-1", ["Hi Bruce, interested in buying your land.", "STOP remove me"], ["sent", "received"]],
    ["Tanya", "Lewis", "575-555-0199", "20", "Luna", "NM", "18-330-02", ["Hi Tanya, would you sell parcel 18-330-02?", "Wrong number. I don't own land there."], ["sent", "received"]]
  ];
  for (const [first, last, phone, acres, county, state, apn, content, direction] of leads) {
    await importLead({
      "First Name": first,
      "Last Name": last,
      "Phone Number": phone,
      "Parcel Acres": acres,
      "Parcel County": county,
      "Parcel State": state,
      APN: apn,
      "Message History Content": content,
      "Message History Direction": direction,
      "Message History Date": ["2026-08-20T14:00:00Z", "2026-08-20T14:07:00Z", "2026-08-20T14:09:00Z", "2026-08-20T14:15:00Z"]
    });
  }

  await prisma.lead.update({
    where: { phone: "+15055550141" },
    data: {
      pipelineStage: "UNDERWRITTEN",
      askingPrice: 35000,
      landPortalUrl: "https://www.landportal.com/",
      lpEstimate: 82000,
      arvWorst: 70000,
      arvMid: 90000,
      arvBest: 110000,
      purchasePrice: 45000,
      droneCost: 200,
      underwritingPackNote: "Demo pack. Later an agent can push comps here."
    }
  });
  await prisma.lead.update({
    where: { phone: "+19285550177" },
    data: {
      pipelineStage: "OFERTA_ENVIADA",
      askingPrice: 28000,
      lpEstimate: 50000,
      arvWorst: 42000,
      arvMid: 56000,
      arvBest: 68000,
      purchasePrice: 22400,
      droneCost: 175
    }
  });
  await prisma.lead.update({
    where: { phone: "+18065550180" },
    data: {
      pipelineStage: "PRECIO_ASK",
      askingPrice: 18000
    }
  });

  await prisma.lead.upsert({
    where: { phone: "+15755550111" },
    update: {},
    create: {
      firstName: "Elena",
      lastName: "Cruz",
      phone: "+15755550111",
      acres: 15,
      county: "Doña Ana",
      state: "NM",
      apn: "DA-220-18",
      status: "HOT",
      pipelineStage: "CERRADO",
      askingPrice: 28000,
      landPortalUrl: "https://www.landportal.com/",
      lpEstimate: 70000,
      arvWorst: 60000,
      arvMid: 72000,
      arvBest: 85000,
      purchasePrice: 36000,
      droneCost: 200,
      closedAt: new Date(),
      nextAction: "Recorded as closed this month for dashboard profit."
    }
  });

  await prisma.lead.upsert({
    where: { phone: "+15755550122" },
    update: {},
    create: {
      firstName: "Omar",
      lastName: "Hale",
      phone: "+15755550122",
      acres: 8,
      county: "Otero",
      state: "NM",
      apn: "OT-118-04",
      status: "HOT",
      pipelineStage: "READY_TO_CLOSE",
      askingPrice: 22000,
      lpEstimate: 48000,
      arvWorst: 40000,
      arvMid: 52000,
      arvBest: 61000,
      purchasePrice: 26000,
      droneCost: 225,
      nextAction: "UNDER_CONTRACT — title and cash-to-close. Projected profit ~$26,000."
    }
  });
}

main().finally(() => prisma.$disconnect());
