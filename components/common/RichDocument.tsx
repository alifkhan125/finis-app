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

function asHtml(value: string) {
  const clean = sanitize(value.trim());
  if (!clean) return "";
  return clean.includes("<") ? clean : `<p>${clean.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`;
}

export default function RichDocument({ html }: { html: string }) {
  const [height, setHeight] = useState(24);
  const source = useMemo(() => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>
    *{box-sizing:border-box}html,body{margin:0;padding:0;background:transparent;color:#555E67;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.65;overflow:hidden}
    p{margin:0 0 10px}p:last-child{margin-bottom:0}h1,h2,h3{color:#24292F;line-height:1.3;margin:14px 0 8px}h1{font-size:22px}h2{font-size:19px}h3{font-size:16px}
    ul,ol{margin:10px 0;padding-left:25px}li{margin:6px 0}blockquote{margin:12px 0;padding:10px 14px;border-left:3px solid #1F5577;background:#EEF4F7;border-radius:0 10px 10px 0}
    a{color:#1F5577;text-decoration:underline;font-weight:600}strong,b{color:#30373D}img{max-width:100%;height:auto}
  </style></head><body>${asHtml(html)}<script>function h(){window.ReactNativeWebView.postMessage(String(Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)))};new ResizeObserver(h).observe(document.body);window.addEventListener('load',h);setTimeout(h,30);</script></body></html>`, [html]);

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
