import * as Linking from "expo-linking";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

function sanitize(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<(iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(iframe|object|embed)[^>]*\/?\s*>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:.*?\2/gi, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainTextToHtml(value: string) {
  // Content pasted into a contentEditable field can lose line breaks. Restore
  // separators used by the legal documents before converting the text.
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(/\s*•\s*/g, "\n• ")
    .replace(/\s+(?=(Company|Address|Email|Phone):)/g, "\n")
    .replace(/(?<=[\]\w.])(?=(Company|Address|Email|Phone):)/g, "\n");

  const lines = normalized.split("\n").map((line) => line.trim());
  const output: string[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    output.push(`<ul>${listItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    output.push(`<p>${paragraphLines.map((line) => escapeHtml(line)).join("<br>")}</p>`);
    paragraphLines = [];
  };

  for (const line of lines) {
    if (!line) {
      flushList();
      flushParagraph();
      continue;
    }

    if (line.startsWith("•")) {
      flushParagraph();
      listItems.push(line.slice(1).trim());
      continue;
    }

    flushList();

    if (/^\d+\.\s+[A-Z][A-Z\s'&-]+$/.test(line)) {
      flushParagraph();
      output.push(`<h3>${escapeHtml(line)}</h3>`);
    } else if (/^(Company|Address|Email|Phone):/i.test(line)) {
      flushParagraph();
      const separator = line.indexOf(":");
      output.push(`<p><strong>${escapeHtml(line.slice(0, separator + 1))}</strong>${escapeHtml(line.slice(separator + 1))}</p>`);
    } else {
      paragraphLines.push(line);
    }
  }

  flushList();
  flushParagraph();
  return output.join("");
}

function legalMarkupToHtml(value: string) {
  const text = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(p|div|blockquote|h1|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return plainTextToHtml(text);
}

function asHtml(value: string, flattenQuoteBlocks: boolean) {
  const clean = sanitize(value.trim());
  if (!clean) return "";
  if (!clean.includes("<")) {
    return plainTextToHtml(clean);
  }

  // Legal content is authored in the dashboard's rich editor. Older content
  // can contain deeply nested blockquotes and spans from pasted formatting.
  // Convert that markup into the same clean document structure used for plain
  // text so the mobile layout matches the dashboard layout.
  return flattenQuoteBlocks ? legalMarkupToHtml(clean) : clean;
}

export default function RichDocument({ html, flattenQuoteBlocks = false }: { html: string; flattenQuoteBlocks?: boolean }) {
  const [height, setHeight] = useState(24);
  const source = useMemo(() => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>
    *{box-sizing:border-box}html,body{margin:0;padding:0;background:transparent;color:#555E67;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.65;overflow:hidden}
    p{margin:0 0 10px}p:last-child{margin-bottom:0}h1,h2,h3{color:#24292F;line-height:1.3;margin:16px 0 8px;font-weight:700}h1{font-size:22px}h2{font-size:19px}h3{font-size:16px}h1:last-child,h2:last-child,h3:last-child{margin-bottom:0}
    ul,ol{margin:6px 0 8px;padding-left:25px}ul:last-child,ol:last-child{margin-bottom:0}li{margin:3px 0}blockquote{margin:12px 0;padding:10px 14px;border-left:3px solid #1F5577;background:#EEF4F7;border-radius:0 10px 10px 0}
    a{color:#1F5577;text-decoration:underline;font-weight:600}strong,b{color:#30373D}img{max-width:100%;height:auto}
  </style></head><body>${asHtml(html, flattenQuoteBlocks)}<script>function h(){window.ReactNativeWebView.postMessage(String(Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)))};new ResizeObserver(h).observe(document.body);window.addEventListener('load',h);setTimeout(h,30);</script></body></html>`, [html, flattenQuoteBlocks]);

  return (
    <View style={{ height, width: "100%", overflow: "hidden" }}>
      <WebView
        source={{ html: source }}
        style={{ height, width: "100%", backgroundColor: "transparent" }}
        originWhitelist={["*"]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        onMessage={(event) => {
          const measured = Number(event.nativeEvent.data);
          if (Number.isFinite(measured) && measured > 0) setHeight(Math.ceil(measured));
        }}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url === "about:blank") return true;
          if (/^https?:\/\//i.test(request.url)) void Linking.openURL(request.url);
          return false;
        }}
      />
    </View>
  );
}
