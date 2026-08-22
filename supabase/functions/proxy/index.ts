const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function safeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https are supported");
  }

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "metadata.google.internal" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("Host not allowed");
  }

  const addrs = await Deno.resolveDns(host, "A").catch(() => [] as string[]);
  const ipv6 = await Deno.resolveDns(host, "AAAA").catch(() => [] as string[]);
  const all = [...addrs, ...ipv6];

  if (all.length === 0) return url;

  for (const ip of all) {
    if (isPrivateIp(ip)) throw new Error("Host not allowed");
  }

  return url;
}

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("fe80:")) return true;
    return false;
  }
  if (ip.startsWith("127.") || ip.startsWith("0.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const octet = Number(ip.split(".")[1]);
    if (octet >= 16 && octet <= 31) return true;
  }
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("100.64.")) return true;
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const incoming = new URL(req.url);
    const proxyPrefix = `${incoming.origin}/functions/v1/proxy?url=`;

    const target = incoming.searchParams.get("url");
    if (!target) {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = await safeUrl(target);

    const response = await fetch(url.toString(), {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });

    const finalUrl = new URL(response.url);
    if (finalUrl.hostname !== url.hostname) {
      await safeUrl(response.url).catch(() => {
        throw new Error("Redirect target not allowed");
      });
    }

    const body = await response.text();
    const rewritten = rewriteHtml(body, response.url, proxyPrefix);

    return new Response(rewritten, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "X-Proxied-URL": response.url,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function rewriteHtml(html: string, finalUrl: string, proxyPrefix: string): string {
  return html
    .replace(/<head[^>]*>/i, (m) => `${m}\n<base href="${finalUrl}">`)
    .replace(/\ssrc=["']([^"']+)["']/gi, (match, val: string) =>
      shouldProxy(val)
        ? ` src="${proxyPrefix}${encodeURIComponent(new URL(val, finalUrl).toString())}"`
        : match
    )
    .replace(/\shref=["']([^"']+)["']/gi, (match, val: string) =>
      shouldProxy(val)
        ? ` href="${proxyPrefix}${encodeURIComponent(new URL(val, finalUrl).toString())}"`
        : match
    )
    .replace(/url\((["']?)([^"')]+)\1\)/gi, (_m, q: string, val: string) =>
      shouldProxy(val)
        ? `url(${q}${proxyPrefix}${encodeURIComponent(new URL(val, finalUrl).toString())}${q})`
        : `url(${q}${val}${q})`
    )
    .replace(/\ssrcset=["']([^"']+)["']/gi, (match, val: string) => {
      const rewritten = val
        .split(",")
        .map((part: string) => {
          const [url, descriptor] = part.trim().split(/\s+/);
          if (!shouldProxy(url)) return part.trim();
          try {
            const absolute = new URL(url, finalUrl).toString();
            return `${proxyPrefix}${encodeURIComponent(absolute)}${descriptor ? " " + descriptor : ""}`;
          } catch {
            return part.trim();
          }
        })
        .join(", ");
      return ` srcset="${rewritten}"`;
    });
}

function shouldProxy(url: string): boolean {
  const lower = url.trim().toLowerCase();
  if (!lower) return false;
  if (lower.startsWith("data:") || lower.startsWith("blob:")) return false;
  if (lower.startsWith("javascript:") || lower.startsWith("mailto:")) return false;
  if (lower.startsWith("#")) return false;
  return true;
}
