// POST /api/contract
// Primeste datele chiriasului, genereaza PDF-ul contractului AST si il trimite
// pe email la chirias si la landlord.

const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const config = require("../config.json");

// ---------- helpers ----------

function money(n) {
  return "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2 });
}

function ukDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function addMonths(iso, months) {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1); // term ends the day before the anniversary
  return d.toISOString().slice(0, 10);
}

function makeReference() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AST-${t}-${r}`;
}

// ---------- PDF generation ----------

function buildPdf({ property, tenant, term, reference, signedAt, clientIp }) {
  const L = config.landlord;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 56, bottom: 56, left: 60, right: 60 } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const H = (t) => doc.moveDown(0.9).font("Helvetica-Bold").fontSize(12).text(t).moveDown(0.3).font("Helvetica").fontSize(10);
    const P = (t) => doc.font("Helvetica").fontSize(10).text(t, { align: "justify", lineGap: 2 });
    const KV = (k, v) => {
      doc.font("Helvetica-Bold").fontSize(10).text(k + ": ", { continued: true });
      doc.font("Helvetica").text(String(v));
    };
    const CLAUSE = (n, t) => doc.font("Helvetica").fontSize(10).text(`${n}. ${t}`, { align: "justify", lineGap: 2, indent: 0 }).moveDown(0.25);

    // ----- Title page header -----
    doc.font("Helvetica-Bold").fontSize(18).text("ASSURED SHORTHOLD TENANCY AGREEMENT", { align: "center" });
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10).fillColor("#444444")
      .text("Under Part 1 of the Housing Act 1988 (as amended by the Housing Act 1996)", { align: "center" });
    doc.moveDown(0.2);
    doc.text(`Reference: ${reference}`, { align: "center" });
    doc.fillColor("black").moveDown(0.5);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor("#999999").stroke().strokeColor("black");

    // ----- 1. Parties -----
    H("1. THE PARTIES");
    KV("The Landlord", `${L.fullName}, of ${L.address}`);
    KV("Landlord contact", `${L.phone} · ${L.email}`);
    doc.moveDown(0.3);
    KV("The Tenant", `${tenant.fullName}, date of birth ${ukDate(tenant.dob)}`);
    KV("Current address", tenant.currentAddress);
    KV("Tenant contact", `${tenant.phone} · ${tenant.email}`);
    if (tenant.occupants && tenant.occupants.trim()) {
      KV("Other permitted occupants", tenant.occupants.trim());
    }

    // ----- 2. Property -----
    H("2. THE PROPERTY");
    KV("Address", property.address);
    KV("Description", `${property.bedrooms}-bedroom property, ${property.furnished.toLowerCase()}`);
    KV("Council tax band", property.councilTaxBand);
    KV("EPC rating", property.epcRating);
    P("The Landlord lets the Property to the Tenant together with any fixtures, fittings, furniture and effects listed in any inventory provided.");

    // ----- 3. Term -----
    H("3. THE TERM");
    KV("Tenancy start date", ukDate(term.startDate));
    KV("Fixed term", `${term.months} months`);
    KV("Fixed term end date", ukDate(term.endDate));
    P("After the fixed term expires, if the tenancy is not renewed or ended, it will continue as a statutory periodic tenancy from month to month on the same terms.");

    // ----- 4. Rent -----
    H("4. THE RENT");
    KV("Rent", `${money(property.rentPcm)} per calendar month`);
    KV("Payable", `in advance, on the ${property.rentDueDay} day of each month`);
    KV("First payment due", ukDate(term.startDate));
    P("The Rent shall be paid by standing order or bank transfer to the account nominated in writing by the Landlord. The Rent is inclusive of nothing except where stated in writing; the Tenant is responsible for council tax, utilities (gas, electricity, water/sewerage), TV licence, and internet/telephone at the Property.");

    // ----- 5. Deposit -----
    H("5. THE DEPOSIT");
    KV("Deposit", money(property.deposit));
    KV("Protection scheme", config.depositScheme.name);
    P(config.depositScheme.info);
    P("The Deposit is held as security for the performance of the Tenant's obligations and to compensate the Landlord for any breach of those obligations. It may be used at the end of the tenancy towards unpaid rent, damage beyond fair wear and tear, missing items, or reasonable cleaning costs.");

    // ----- 6. Tenant obligations -----
    H("6. TENANT'S OBLIGATIONS");
    P("The Tenant agrees:");
    doc.moveDown(0.25);
    let n = 0;
    [
      "To pay the Rent on the days and in the manner set out above, whether or not it has been formally demanded.",
      "To pay all charges for council tax, gas, electricity, water and sewerage, TV licence and telecommunications used at or supplied to the Property during the tenancy, and to register with the relevant suppliers and the local authority.",
      "To use the Property as a single private residence only, for the Tenant and permitted occupants named in this agreement, and not to carry on any trade or business at the Property.",
      "Not to sublet, assign, or part with possession of the whole or any part of the Property, and not to take in lodgers or paying guests, without the Landlord's prior written consent.",
      "To keep the interior of the Property, and its fixtures, fittings and contents, in good and clean condition throughout the tenancy, fair wear and tear excepted.",
      "Not to make any alterations, additions or redecoration to the Property, nor to fix anything to the walls beyond ordinary picture hooks, without the Landlord's prior written consent.",
      "To report promptly to the Landlord any damage, disrepair, leak or defect at the Property, and any failure of smoke or carbon monoxide alarms.",
      "To test smoke and carbon monoxide alarms regularly and replace batteries where applicable.",
      "Not to cause or permit any nuisance, annoyance or antisocial behaviour to neighbours or other occupiers, and not to use the Property for any illegal or immoral purpose.",
      "Not to keep any pets or animals at the Property without the Landlord's prior written consent, such consent not to be unreasonably withheld or delayed.",
      "Not to smoke, and not to permit any occupier or visitor to smoke, inside the Property.",
      "To keep the Property adequately heated and ventilated so as to prevent condensation, mould and frozen pipes, and to take reasonable precautions when the Property is left empty in cold weather.",
      "To permit the Landlord or persons authorised by the Landlord, upon at least 24 hours' written notice (except in emergency), to enter the Property at reasonable times to inspect its condition or carry out repairs, gas safety checks or other legal obligations.",
      "During the last month of the tenancy, to permit reasonable viewings by prospective tenants or purchasers, upon at least 24 hours' notice.",
      "To return all keys and give up the Property at the end of the tenancy in the same condition and state of cleanliness as at the start, fair wear and tear excepted, and to remove all personal belongings and rubbish.",
      "Not to change the locks or install additional locks without the Landlord's prior written consent; any permitted change requires a copy of the new key to be given to the Landlord.",
      "To notify the Landlord in writing of any period the Property will be left unoccupied for more than 14 consecutive days."
    ].forEach((t) => { n += 1; CLAUSE(`6.${n}`, t); });

    // ----- 7. Landlord obligations -----
    H("7. LANDLORD'S OBLIGATIONS");
    P("The Landlord agrees:");
    doc.moveDown(0.25);
    n = 0;
    [
      "To allow the Tenant quiet enjoyment of the Property during the tenancy without unlawful interruption by the Landlord or anyone acting on the Landlord's behalf.",
      "To keep in repair the structure and exterior of the Property (including drains, gutters and external pipes) and to keep in repair and proper working order the installations for the supply of water, gas, electricity, sanitation, space heating and hot water, in accordance with section 11 of the Landlord and Tenant Act 1985.",
      "To ensure a valid Gas Safety Certificate is in place at all times where gas is supplied, and to provide a copy to the Tenant.",
      "To ensure a satisfactory Electrical Installation Condition Report (EICR) is in place and provided to the Tenant.",
      "To provide the Tenant with a copy of the Energy Performance Certificate and the current version of the government's 'How to Rent' guide.",
      "To protect the Deposit in an authorised scheme and serve the prescribed information within 30 days of receipt.",
      "To install and maintain smoke alarms on each storey and carbon monoxide alarms in any room with a fixed combustion appliance, working at the start of the tenancy.",
      "To insure the building of the Property. The Tenant is responsible for insuring their own personal possessions."
    ].forEach((t) => { n += 1; CLAUSE(`7.${n}`, t); });

    // ----- 8. Ending the tenancy -----
    H("8. ENDING THE TENANCY");
    n = 0;
    [
      "The Tenant may end the tenancy at the end of the fixed term by giving at least one month's written notice expiring on or after the last day of the fixed term.",
      "After the fixed term, during any statutory periodic tenancy, the Tenant may end the tenancy by giving at least one month's written notice expiring at the end of a rental period.",
      "The Landlord may recover possession in accordance with the Housing Act 1988, including by serving notice under section 21 or section 8 where the relevant statutory conditions are met.",
      "This agreement may be ended early only by written agreement between both parties (a surrender), on such terms as they agree.",
      "At the end of the tenancy the Tenant must provide a forwarding address for the purposes of the deposit return."
    ].forEach((t) => { n += 1; CLAUSE(`8.${n}`, t); });

    // ----- 9. Other terms -----
    H("9. OTHER TERMS");
    n = 0;
    [
      "Any notice served under this agreement shall be in writing. Notices to the Landlord shall be sent to the Landlord's address stated above, which is also the address for service of notices (including notices in proceedings) under section 48 of the Landlord and Tenant Act 1987. Notices to the Tenant may be delivered to the Property or sent to the Tenant's email address stated above.",
      "If any rent is unpaid 14 days after falling due, interest may be charged at 3% above the Bank of England base rate on the overdue amount from the due date until payment, in accordance with the Tenant Fees Act 2019.",
      "A charge may be made for the reasonable costs of replacing lost keys or security devices, limited to the costs reasonably incurred, in accordance with the Tenant Fees Act 2019.",
      "This agreement is governed by the law of England and Wales and the parties submit to the jurisdiction of the courts of England and Wales.",
      "If any clause of this agreement is found to be unenforceable, the remainder of the agreement remains in force. Nothing in this agreement affects the Tenant's statutory rights."
    ].forEach((t) => { n += 1; CLAUSE(`9.${n}`, t); });

    // ----- 10. Declaration & signatures -----
    H("10. DECLARATION AND SIGNATURES");
    P("Both parties have read and understood this agreement and agree to be bound by its terms. This agreement has been signed electronically. Each party agrees that their electronic signature below is the legal equivalent of a handwritten signature.");
    doc.moveDown(1);

    // Signature blocks (start a new page if there's not enough room)
    if (doc.y > 640) doc.addPage();
    const sigTop = doc.y;
    const colW = 220;
    // Landlord
    doc.font("Helvetica-Bold").fontSize(10).text("SIGNED by the Landlord:", 60, sigTop);
    doc.font("Helvetica-Oblique").fontSize(14).text(L.signatureName, 60, sigTop + 18);
    doc.moveTo(60, sigTop + 40).lineTo(60 + colW, sigTop + 40).strokeColor("#333333").stroke();
    doc.font("Helvetica").fontSize(9).fillColor("#444444")
      .text(`${L.fullName}`, 60, sigTop + 44)
      .text(`Date: ${signedAt}`, 60, sigTop + 56);
    // Tenant
    doc.fillColor("black").font("Helvetica-Bold").fontSize(10).text("SIGNED by the Tenant:", 315, sigTop);
    doc.font("Helvetica-Oblique").fontSize(14).text(tenant.signature, 315, sigTop + 18);
    doc.moveTo(315, sigTop + 40).lineTo(315 + colW, sigTop + 40).stroke();
    doc.font("Helvetica").fontSize(9).fillColor("#444444")
      .text(`${tenant.fullName}`, 315, sigTop + 44)
      .text(`Date: ${signedAt}`, 315, sigTop + 56);

    doc.moveDown(4);
    doc.fillColor("#666666").fontSize(8).text(
      `Electronic signature record — Reference ${reference} · Signed by the Tenant online at ${signedAt} · IP address: ${clientIp || "not recorded"} · The Tenant confirmed the declaration: "I confirm I have read this agreement, the details I provided are true, and I agree to sign it electronically."`,
      60, doc.y, { width: 475, align: "left" }
    );
    doc.fillColor("black");

    doc.end();
  });
}

// ---------- email ----------

function makeTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ---------- handler ----------

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const b = req.body || {};

    // 1) Validate property (never trust the client for rent/deposit)
    const property = config.properties.find((p) => p.id === b.propertyId && p.available);
    if (!property) return res.status(400).json({ error: "Unknown or unavailable property." });

    // 2) Validate tenant fields
    const required = ["fullName", "dob", "currentAddress", "phone", "email", "startDate", "termMonths", "signature"];
    for (const f of required) {
      if (!b[f] || String(b[f]).trim() === "") {
        return res.status(400).json({ error: `Missing field: ${f}` });
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }
    if (b.agreed !== true) {
      return res.status(400).json({ error: "You must confirm the declaration to sign." });
    }
    const months = parseInt(b.termMonths, 10);
    if (![6, 12].includes(months)) {
      return res.status(400).json({ error: "Term must be 6 or 12 months." });
    }
    const start = String(b.startDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || isNaN(new Date(start).getTime())) {
      return res.status(400).json({ error: "Invalid start date." });
    }

    const tenant = {
      fullName: String(b.fullName).trim().slice(0, 120),
      dob: String(b.dob),
      currentAddress: String(b.currentAddress).trim().slice(0, 250),
      phone: String(b.phone).trim().slice(0, 40),
      email: String(b.email).trim().slice(0, 120),
      occupants: String(b.occupants || "").slice(0, 250),
      signature: String(b.signature).trim().slice(0, 120),
    };

    const term = { startDate: start, months, endDate: addMonths(start, months) };
    const reference = makeReference();
    const signedAt = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });
    const clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();

    // 3) Build the PDF
    const pdf = await buildPdf({ property, tenant, term, reference, signedAt, clientIp });
    const filename = `Tenancy-Agreement-${reference}.pdf`;

    // 4) Email tenant + landlord
    const transport = makeTransport();
    const L = config.landlord;

    await transport.sendMail({
      from: `"${L.fullName}" <${process.env.GMAIL_USER}>`,
      to: tenant.email,
      bcc: L.email,
      subject: `Your Tenancy Agreement — ${property.address} (${reference})`,
      text:
`Dear ${tenant.fullName},

Please find attached your signed Assured Shorthold Tenancy Agreement for:

${property.address}
Start date: ${ukDate(start)} · Term: ${months} months
Rent: ${money(property.rentPcm)} pcm · Deposit: ${money(property.deposit)}

Keep this document safe — it is your copy of the contract. A copy has also been sent to the landlord.

If anything looks wrong, reply to this email before your start date.

Kind regards,
${L.fullName}
${L.phone}`,
      attachments: [{ filename, content: pdf }],
    });

    return res.status(200).json({ ok: true, reference });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong generating the contract. Please try again." });
  }
};
