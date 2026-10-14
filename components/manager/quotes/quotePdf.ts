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
  estimatedTime: string;
  projectMetaLabel: string;
  validUntilLabel: string;
  workGroups: QuoteSelectedWorkGroup[];
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
};

function buildQuoteHtml(params: GenerateQuotePdfParams) {
  const selectedGroups = params.workGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.selected),
    }))
    .filter((group) => group.items.length > 0);

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
        h1 { font-size: 28px; margin-bottom: 8px; }
        h2 { font-size: 18px; margin: 24px 0 12px; }
        .card { border: 1px solid #d7e0e8; border-radius: 16px; padding: 16px; margin-bottom: 16px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; gap: 16px; }
        .muted { color: #66707B; }
        .total { background: #1F5577; color: #fff; border-radius: 16px; padding: 16px; margin-top: 16px; }
        .group { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-top: 12px; }
      </style>
    </head>
    <body>
      <h1>Construction Quote</h1>
      <div class="card">
        ${params.companyName ? `<div><strong>Company:</strong> ${escapeHtml(params.companyName)}</div>` : ""}
        ${params.projectName ? `<div style="margin-top:8px"><strong>Project:</strong> ${escapeHtml(params.projectName)}</div>` : ""}
        <div><strong>Client:</strong> ${escapeHtml(params.clientName || "")}</div>
        <div style="margin-top:8px"><strong>Email:</strong> ${escapeHtml(params.email || "N/A")}</div>
        <div style="margin-top:8px"><strong>Phone:</strong> ${escapeHtml(params.phoneNumber || "N/A")}</div>
        <div style="margin-top:8px"><strong>Project Address:</strong> ${escapeHtml(params.projectAddress || "")}</div>
        <div style="margin-top:8px"><strong>Project Details:</strong> ${escapeHtml(`${params.projectType} • ${params.propertyType} • ${params.unitType}`)}</div>
        <div style="margin-top:8px"><strong>Schedule:</strong> ${escapeHtml(`${params.startDate || "N/A"} - ${params.endDate || "N/A"}`)}</div>
        <div style="margin-top:8px"><strong>Structure:</strong> ${escapeHtml(`${params.floorsCount || "0"} floors • ${params.unitsPerFloor || "0"} units/floor`)}</div>
        ${params.projectMetaLabel ? `<div style="margin-top:8px"><strong>Project Meta:</strong> ${escapeHtml(params.projectMetaLabel)}</div>` : ""}
        <div style="margin-top:8px"><strong>Estimated Timeline:</strong> ${escapeHtml(params.estimatedTime || "")}</div>
        <div style="margin-top:8px"><strong>Quote Valid Until:</strong> ${escapeHtml(params.validUntilLabel)}</div>
      </div>

      <h2>Selected Work Items</h2>
      <div class="card">
        ${selectedGroups
          .map(
            (group) => `
              <div class="group">
                <div class="row"><strong>${escapeHtml(group.title)}</strong><strong>${formatCurrency(
                  group.items.reduce(
                    (sum, item) =>
                      sum +
                      (Number(item.quantity) || 0) * item.selectedUnitPrice,
                    0,
                  ),
                )}</strong></div>
                ${group.items
                  .map(
                    (item) => `
                      <div class="row">
                        <div>
                          <div>${escapeHtml(item.title)}</div>
                          <div class="muted">${escapeHtml(String(item.quantity ?? ""))} ${escapeHtml(String(item.selectedUnit ?? ""))} × ${formatCurrency(item.selectedUnitPrice)}</div>
                        </div>
                        <div>${formatCurrency((Number(item.quantity) || 0) * item.selectedUnitPrice)}</div>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
            `,
          )
          .join("")}
        <div class="row" style="margin-top:12px"><strong>Subtotal</strong><strong>${formatCurrency(params.subtotal)}</strong></div>
        ${params.discountAmount > 0 ? `<div class="row"><strong>Discount</strong><strong>-${formatCurrency(params.discountAmount)}</strong></div>` : ""}
      </div>

      <div class="total">
        <div class="muted" style="color:#C8DCE9">Final Total</div>
        <div style="font-size:28px;font-weight:700;margin-top:8px">${formatCurrency(params.finalTotal)}</div>
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
