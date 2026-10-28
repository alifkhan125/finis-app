import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Linking } from "react-native";
import {
  formatCurrency,
  type QuoteProjectType,
  type QuotePropertyType,
  type QuoteUnitType,
} from "./quoteTypes";
import type { QuoteSelectedWorkGroup } from "./QuoteWorkGroupCard";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type GenerateQuotePdfParams = {
  quoteNumber?: string;
  companyName?: string;
  projectName?: string;
  clientName: string;
  email?: string;
  phoneNumber?: string;
  projectAddress: string;
  projectType: QuoteProjectType;
  propertyType: QuotePropertyType;
  unitType: QuoteUnitType;
  startDate?: string;
  endDate?: string;
  floorsCount?: string;
  unitsPerFloor?: string;
  estimatedTime?: string;
  projectMetaLabel?: string;
  validUntilLabel?: string;
  workGroups?: QuoteSelectedWorkGroup[];
  tasks?: Array<{
    title: string;
    description?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount?: number;
  finalTotal: number;
  quotationDetails?: any[];
};

function buildQuoteHtml(params: GenerateQuotePdfParams) {
  const selectedGroups = (params.workGroups || [])
    .map((group) => ({
      ...group,
      items: (group.items || []).filter((item) => item.selected),
    }))
    .filter((group) => group.items.length > 0);

  // Normalize items for unified table
  const items: Array<{
    title: string;
    description?: string;
    quantity: number | string;
    unit?: string;
    unitPrice: number;
    totalPrice: number;
  }> = [];

  if (params.tasks && params.tasks.length > 0) {
    params.tasks.forEach((t) => {
      items.push({
        title: t.title,
        description: t.description,
        quantity: t.quantity,
        unit: t.unit || "unit",
        unitPrice: t.unitPrice,
        totalPrice: t.totalPrice,
      });
    });
  } else {
    selectedGroups.forEach((group) => {
      group.items.forEach((item) => {
        items.push({
          title: item.title,
          description: group.title !== item.title ? group.title : undefined,
          quantity: item.quantity ?? 1,
          unit: item.selectedUnit || "unit",
          unitPrice: item.selectedUnitPrice,
          totalPrice: (Number(item.quantity) || 1) * item.selectedUnitPrice,
        });
      });
    });
  }

  const issueDate = new Date().toISOString().split("T")[0];
  const classification = [params.projectType, params.propertyType, params.unitType]
    .filter(Boolean)
    .join(" • ") || "General Construction";
  const scheduleStr = `${params.startDate || "TBD"} to ${params.endDate || "TBD"}`;

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Quotation & Service Agreement - ${escapeHtml(params.quoteNumber || "Quote")}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 24px;
          color: #0F172A;
          background: #FFFFFF;
          font-size: 13px;
          line-height: 1.5;
        }
        @media print {
          body { padding: 0; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
        }
        .header-banner {
          background-color: #1D4F6D;
          border-radius: 8px;
          padding: 20px 24px;
          color: #FFFFFF;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .header-pill {
          display: inline-block;
          background-color: #13394F;
          color: #99C7E3;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 3px 10px;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .header-title {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #FFFFFF;
        }
        .header-company {
          font-size: 13px;
          color: #DCEAF2;
          margin: 0 0 2px 0;
        }
        .header-sub {
          font-size: 11px;
          color: #A3C8DE;
          margin: 0;
        }
        .header-meta {
          text-align: right;
        }
        .header-ref {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .header-date {
          font-size: 11px;
          color: #DCEAF2;
          margin-bottom: 8px;
        }
        .header-badge {
          display: inline-block;
          background-color: #246387;
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .preamble-box {
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 12px 16px;
          font-size: 11px;
          font-style: italic;
          color: #475569;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: #1D4F6D;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 20px 0 10px 0;
        }
        .section-sub {
          font-size: 11px;
          color: #64748B;
          margin: -6px 0 10px 0;
        }
        .parties-grid {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        .party-card {
          flex: 1;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          overflow: hidden;
          background: #FFFFFF;
        }
        .party-header {
          background-color: #F1F5F9;
          padding: 6px 12px;
          font-size: 10px;
          font-weight: 700;
          color: #1D4F6D;
          letter-spacing: 0.5px;
        }
        .party-body {
          padding: 10px 12px;
          font-size: 11px;
          color: #475569;
          line-height: 1.6;
        }
        .party-name {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 4px;
        }
        .specs-bar {
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 11px;
          margin-bottom: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px 24px;
        }
        .specs-item strong {
          color: #1D4F6D;
        }
        .terms-box {
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 12px 16px;
          font-size: 11px;
          color: #475569;
          margin-bottom: 20px;
        }
        .terms-item {
          margin-bottom: 6px;
          line-height: 1.5;
        }
        .terms-item:last-child {
          margin-bottom: 0;
        }
        table.scope-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11px;
        }
        table.scope-table th {
          background-color: #1E293B;
          color: #FFFFFF;
          font-weight: 700;
          padding: 8px 10px;
          text-align: left;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        table.scope-table th.text-right {
          text-align: right;
        }
        table.scope-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #E2E8F0;
          color: #0F172A;
        }
        table.scope-table tr:nth-child(even) td {
          background-color: #F8FAFC;
        }
        table.scope-table td.text-right {
          text-align: right;
        }
        .item-desc {
          font-size: 10px;
          color: #64748B;
          margin-top: 2px;
        }
        .summary-container {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
        }
        .summary-box {
          width: 320px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 12px;
          color: #475569;
        }
        .total-card {
          background-color: #1D4F6D;
          border-radius: 6px;
          padding: 12px 16px;
          color: #FFFFFF;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }
        .total-label {
          font-size: 11px;
          font-weight: 700;
          color: #BEE3F8;
          letter-spacing: 0.5px;
        }
        .total-sub {
          font-size: 10px;
          color: #E2E8F0;
        }
        .total-amount {
          font-size: 20px;
          font-weight: 700;
        }
        .clause-text {
          font-size: 11px;
          color: #475569;
          margin-bottom: 14px;
          line-height: 1.5;
        }
        .signatures-grid {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        .sig-box {
          flex: 1;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          overflow: hidden;
          background: #FFFFFF;
        }
        .sig-header {
          background-color: #F1F5F9;
          padding: 8px 12px;
          font-size: 10px;
          font-weight: 700;
          color: #1D4F6D;
          letter-spacing: 0.5px;
        }
        .sig-body {
          padding: 12px;
        }
        .sig-name {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 24px;
        }
        .sig-line {
          border-bottom: 1px solid #94A3B8;
          margin-bottom: 4px;
        }
        .sig-sub {
          font-size: 10px;
          color: #64748B;
          margin-bottom: 14px;
        }
        .sig-field {
          font-size: 11px;
          color: #334155;
          margin-bottom: 8px;
        }
        .sig-badge-area {
          text-align: right;
          margin-top: 10px;
          font-size: 10px;
          font-weight: 700;
        }
        .footer-note {
          text-align: center;
          font-size: 10px;
          color: #94A3B8;
          border-top: 1px solid #E2E8F0;
          padding-top: 12px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <!-- Header Banner -->
      <div class="header-banner">
        <div>
          <div class="header-pill">COMMERCIAL CONTRACT &amp; QUOTATION</div>
          <h1 class="header-title">QUOTATION &amp; SERVICE AGREEMENT</h1>
          <div class="header-company">${escapeHtml(params.companyName || "Service Provider")}</div>
          <div class="header-sub">Binding commercial contract upon mutual execution</div>
        </div>
        <div class="header-meta">
          <div class="header-ref">Ref: ${escapeHtml(params.quoteNumber || "QUOTE-CONTRACT")}</div>
          <div class="header-date">Issued: ${issueDate}</div>
          <div class="header-badge">ISSUED</div>
        </div>
      </div>

      <!-- Legal Contract Preamble -->
      <div class="preamble-box">
        This Document constitutes a formal Commercial Quotation and Service Agreement ("Agreement") between the Parties identified below. Mutual signature and execution of this Agreement establishes the agreed scope of works, specifications, pricing, and legally binding terms governing the project.
      </div>

      <!-- Section 1: Parties & Project -->
      <div class="section-title">1. CONTRACT PARTIES &amp; PROJECT SPECIFICATIONS</div>
      <div class="parties-grid">
        <!-- Party A -->
        <div class="party-card">
          <div class="party-header">PARTY A: SERVICE PROVIDER (COMPANY)</div>
          <div class="party-body">
            <div class="party-name">${escapeHtml(params.companyName || "Finis Contractor")}</div>
            <div>Representative: Authorized Company Signatory</div>
            <div>Email: Authorized Office</div>
            <div>Role: Prime Contractor &amp; Service Provider</div>
          </div>
        </div>
        <!-- Party B -->
        <div class="party-card">
          <div class="party-header">PARTY B: CUSTOMER / SERVICE RECEIVER</div>
          <div class="party-body">
            <div class="party-name">${escapeHtml(params.clientName || "Valued Customer")}</div>
            <div>Phone: ${escapeHtml(params.phoneNumber || "N/A")}</div>
            <div>Email: ${escapeHtml(params.email || "N/A")}</div>
            <div>Address: ${escapeHtml(params.projectAddress || "N/A")}</div>
          </div>
        </div>
      </div>

      <!-- Project Specs Bar -->
      <div class="specs-bar">
        <div class="specs-item"><strong>Project Name:</strong> ${escapeHtml(params.projectName || "General Project")}</div>
        <div class="specs-item"><strong>Classification:</strong> ${escapeHtml(classification)}</div>
        <div class="specs-item"><strong>Schedule:</strong> ${escapeHtml(scheduleStr)}</div>
        ${params.estimatedTime ? `<div class="specs-item"><strong>Timeline:</strong> ${escapeHtml(params.estimatedTime)}</div>` : ""}
      </div>

      <!-- Section 2: Details & Terms -->
      <div class="section-title">2. QUOTATION DETAILS &amp; CONTRACT TERMS</div>
      <div class="terms-box">
        <div class="terms-item"><strong>1. Scope of Work:</strong> The Service Provider agrees to provide all labor, materials, and equipment required to complete the itemized services detailed in Section 3 in a good and workmanlike manner.</div>
        <div class="terms-item"><strong>2. Contract Consideration &amp; Payment:</strong> Invoices will be rendered upon completion and inspection of designated milestones or tasks. Payment is due within the agreed payment schedule.</div>
        <div class="terms-item"><strong>3. Variations &amp; Change Orders:</strong> Any modification, addition, or deletion to the described work must be agreed upon in writing by both parties before proceeding.</div>
        <div class="terms-item"><strong>4. Acceptance &amp; Validity:</strong> This quotation remains open for formal acceptance for 30 calendar days from the date of issue unless extended in writing by the Service Provider.</div>
      </div>

      <!-- Section 3: Scope Table -->
      <div class="section-title">3. SCOPE OF SERVICES &amp; ITEMIZED WORK SCHEDULE</div>
      <div class="section-sub">Only items and quantities explicitly enumerated below are included in this contract.</div>
      <table class="scope-table">
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>SERVICE / WORK ITEM DESCRIPTION</th>
            <th class="text-right" style="width: 80px;">QUANTITY</th>
            <th class="text-right" style="width: 90px;">UNIT RATE</th>
            <th class="text-right" style="width: 100px;">LINE TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>
                <strong>${escapeHtml(item.title)}</strong>
                ${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ""}
              </td>
              <td class="text-right">${escapeHtml(String(item.quantity))} ${escapeHtml(item.unit || "unit")}</td>
              <td class="text-right">${formatCurrency(item.unitPrice)}</td>
              <td class="text-right"><strong>${formatCurrency(item.totalPrice)}</strong></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <!-- Section 4: Summary -->
      <div class="avoid-break">
        <div class="section-title">4. COMMERCIAL SUMMARY &amp; TOTAL CONTRACT VALUE</div>
        <div class="summary-container">
          <div class="summary-box">
            <div class="summary-row">
              <span>Subtotal Amount:</span>
              <span>${formatCurrency(params.subtotal)}</span>
            </div>
            ${
              params.discountAmount > 0
                ? `<div class="summary-row">
                    <span>Discount Applied:</span>
                    <span>-${formatCurrency(params.discountAmount)}</span>
                  </div>`
                : ""
            }
            ${
              (params.taxAmount ?? 0) > 0
                ? `<div class="summary-row">
                    <span>Estimated Tax:</span>
                    <span>${formatCurrency(params.taxAmount ?? 0)}</span>
                  </div>`
                : ""
            }
            <div class="total-card">
              <div>
                <div class="total-label">TOTAL CONTRACT VALUE</div>
                <div class="total-sub">Inclusive of all listed specifications</div>
              </div>
              <div class="total-amount">${formatCurrency(params.finalTotal)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 5: Execution & Dual Signatures -->
      <div class="avoid-break">
        <div class="section-title">5. EXECUTION &amp; MUTUAL ACCEPTANCE (SIGNATURES)</div>
        <div class="clause-text">
          IN WITNESS WHEREOF, the Parties hereto have caused this Commercial Quotation &amp; Service Agreement to be duly executed by their authorized representatives as of the date written below. Mutual execution affirms full agreement with the specifications, scope, terms, and total commercial consideration.
        </div>
        <div class="signatures-grid">
          <!-- Box 1: Company Signature -->
          <div class="sig-box">
            <div class="sig-header">FOR SERVICE PROVIDER (COMPANY)</div>
            <div class="sig-body">
              <div class="sig-name">${escapeHtml(params.companyName || "Service Provider")}</div>
              <div class="sig-line"></div>
              <div class="sig-sub">Authorized Representative Signature</div>
              <div class="sig-field">Printed Name: _________________________________</div>
              <div class="sig-field">Title / Designation: ____________________________</div>
              <div class="sig-field">Execution Date: ________________________________</div>
              <div class="sig-badge-area" style="color: #94A3B8;">[ OFFICIAL COMPANY SEAL / STAMP ]</div>
            </div>
          </div>
          <!-- Box 2: Customer Signature -->
          <div class="sig-box">
            <div class="sig-header">FOR CUSTOMER / SERVICE RECEIVER</div>
            <div class="sig-body">
              <div class="sig-name">${escapeHtml(params.clientName || "Customer")}</div>
              <div class="sig-line"></div>
              <div class="sig-sub">Customer / Authorized Signatory</div>
              <div class="sig-field">Printed Name: _________________________________</div>
              <div class="sig-field">Title / Capacity: ______________________________</div>
              <div class="sig-field">Acceptance Date: _______________________________</div>
              <div class="sig-badge-area" style="color: #16A34A;">[ ACCEPTED &amp; CONFIRMED ]</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Note -->
      <div class="footer-note">
        ${escapeHtml(params.quoteNumber || "QUOTE")} &bull; Legally Binding Commercial Contract &bull; Confidential
      </div>
    </body>
  </html>`;
}

export async function createQuotePdf(params: GenerateQuotePdfParams) {
  const html = buildQuoteHtml(params);
  return Print.printToFileAsync({ html });
}

export async function generateQuotePdf(params: GenerateQuotePdfParams) {
  const result = await createQuotePdf(params);

  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert("PDF Ready", `Quote PDF created at: ${result.uri}`);
    return result.uri;
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: "application/pdf",
    dialogTitle: "Download Quote PDF",
    UTI: "com.adobe.pdf",
  });

  return result.uri;
}

export async function emailQuotePdf(
  params: GenerateQuotePdfParams & { recipientEmail?: string },
) {
  const result = await createQuotePdf(params);
  const subject = `Quote for ${params.clientName || "Client"}`;
  const body = `Please find the attached quote for ${params.projectType} • ${params.propertyType} • ${params.unitType}.`;

  try {
    const MailComposer = await import("expo-mail-composer");
    if (await MailComposer.isAvailableAsync()) {
      await MailComposer.composeAsync({
        recipients: params.recipientEmail ? [params.recipientEmail] : [],
        subject,
        body,
        attachments: [result.uri],
      });
      return;
    }
  } catch {
    // Fall back to mailto below.
  }

  const mailto = `mailto:${encodeURIComponent(params.recipientEmail || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const supported = await Linking.canOpenURL(mailto);
  if (supported) {
    await Linking.openURL(mailto);
    Alert.alert(
      "Email Composer",
      "Email opened without attachment because native mail composer is unavailable on this device.",
    );
    return;
  }

  Alert.alert(
    "Email Not Available",
    "No email composer is available on this device.",
  );
}
