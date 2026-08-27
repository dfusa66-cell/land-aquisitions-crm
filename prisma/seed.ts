import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";
import { importLead } from "../lib/import-lead";

async function main() {
  await prisma.user.upsert({
    where: { email: "diego@example.com" },
    update: {},
    create: { email: "diego@example.com", name: "Diego", passwordHash: await hash("demo1234", 10) }
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
}

main().finally(() => prisma.$disconnect());
