addEventListener("fetch", function (event) {
  event.respondWith(handleRequest(event.request));
});

// request path. Please modify this path to prevent everyone from using this worker.
const endpointPath = "/dns-query";

// Default DoH server
// https://1.1.1.1/dns-query
// https://1.0.0.1/dns-query
// https://dns.quad9.net/dns-query
// https://dns9.quad9.net/dns-query
// https://dns.google/dns-query
const defaultDoh = "https://cloudflare-dns.com/dns-query";

// Domain-based DoH server mapping - using Map for faster lookups
const domainMapping = new Map([
  ["shecan.ir", "https://free.shecan.ir/dns-query"],
  ["chatgpt.com", "https://free.shecan.ir/dns-query"],
  ["claude.ai", "https://free.shecan.ir/dns-query"],
  ["gemini.google.com", "https://free.shecan.ir/dns-query"],
  ["ollama.com", "https://free.shecan.ir/dns-query"],
  ["miro.com", "https://free.shecan.ir/dns-query"],
  ["mural.co", "https://free.shecan.ir/dns-query"],
  ["app.mural.co", "https://free.shecan.ir/dns-query"],
  ["labs.google", "https://free.shecan.ir/dns-query"],
  ["clickup.com", "https://free.shecan.ir/dns-query"],
  ["app.clickup.com", "https://free.shecan.ir/dns-query"],
  ["cloudflare.com", "https://free.shecan.ir/dns-query"],
  ["dash.cloudflare.com", "https://free.shecan.ir/dns-query"],
  ["mongodb.com", "https://free.shecan.ir/dns-query"],
  ["figma.com", "https://free.shecan.ir/dns-query"],
  ["colab.research.google.com", "https://free.shecan.ir/dns-query"],
  ["colab.google", "https://free.shecan.ir/dns-query"],
  ["atlassian.design", "https://free.shecan.ir/dns-query"],
  ["notebooklm.google.com", "https://free.shecan.ir/dns-query"],
  ["notebooklm.google", "https://free.shecan.ir/dns-query"],
  ["elevenlabs.io", "https://free.shecan.ir/dns-query"],
  ["aistudio.google.com", "https://free.shecan.ir/dns-query"],
  ["app.heygen.com", "https://free.shecan.ir/dns-query"],
  ["podcast.adobe.com", "https://free.shecan.ir/dns-query"],
  ["app.lmnt.com", "https://free.shecan.ir/dns-query"],
  ["api.lmnt.com", "https://free.shecan.ir/dns-query"],
  ["lmnt.us.auth0.com", "https://free.shecan.ir/dns-query"],
  ["us.auth0.com", "https://free.shecan.ir/dns-query"],
  ["auth0.com", "https://free.shecan.ir/dns-query"],
  ["hub.docker.com", "https://free.shecan.ir/dns-query"],
  ["docker.com", "https://free.shecan.ir/dns-query"],
  ["seaart.ai", "https://free.shecan.ir/dns-query"],
  ["bitbucket.org", "https://free.shecan.ir/dns-query"],
  ["workspace.google.com", "https://free.shecan.ir/dns-query"],
  // Add more mappings as needed
]);

const contype = "application/dns-message";

// Optimized function to extract domain from DNS query
function extractDomainFromDnsQuery(dnsParam) {
  try {
    // For GET requests with dns parameter (base64 encoded)
    if (!dnsParam) return null;

    const decoded = atob(dnsParam);
    let pos = 12; // Skip the header (12 bytes)

    // Read domain parts more efficiently
    const domainParts = [];
    let labelLength = decoded.charCodeAt(pos);

    while (labelLength > 0) {
      pos++;
      domainParts.push(decoded.substr(pos, labelLength));
      pos += labelLength;
      labelLength = decoded.charCodeAt(pos);
    }

    return domainParts.join(".").toLowerCase();
  } catch (e) {
    // Silent error handling for better performance
    return null;
  }
}

// Optimized function to extract domain from POST request
async function extractDomainFromPostRequest(arrayBuffer) {
  try {
    const buffer = new Uint8Array(arrayBuffer);
    let pos = 12; // Skip the header

    // Read domain parts more efficiently
    const domainParts = [];
    let labelLength = buffer[pos];

    while (labelLength > 0) {
      pos++;
      // Use a more efficient method for decoding text
      let label = "";
      for (let i = 0; i < labelLength; i++) {
        label += String.fromCharCode(buffer[pos + i]);
      }
      domainParts.push(label);
      pos += labelLength;
      labelLength = buffer[pos];
    }

    return domainParts.join(".").toLowerCase();
  } catch (e) {
    // Silent error handling
    return null;
  }
}

// Optimized function to determine which DoH server to use
function getDohServerForDomain(domain) {
  if (!domain) return defaultDoh;

  // Direct map lookup is faster
  if (domainMapping.has(domain)) return domainMapping.get(domain);

  // Check for subdomains
  for (const [key, value] of domainMapping) {
    if (domain.endsWith("." + key)) {
      return value;
    }
  }

  return defaultDoh;
}

async function handleRequest(request) {
  const { method, headers } = request;
  const clientUrl = new URL(request.url);

  // Early exit for non-matching paths
  if (clientUrl.pathname !== endpointPath) {
    return new Response("Not Found. HTTP 404.", { status: 404 });
  }

  const searchParams = clientUrl.searchParams;

  // Handle GET request with DNS parameter
  if (method === "GET" && searchParams.has("dns")) {
    const dnsParam = searchParams.get("dns");
    const domain = extractDomainFromDnsQuery(dnsParam);
    const targetDoh = getDohServerForDomain(domain);

    // Direct fetch without additional processing
    return fetch(`${targetDoh}?dns=${dnsParam}`, {
      method: "GET",
      headers: { Accept: contype },
    });
  }

  // Handle POST request
  if (method === "POST" && headers.get("content-type") === contype) {
    const arrayBuffer = await request.arrayBuffer();
    const domain = await extractDomainFromPostRequest(arrayBuffer);
    const targetDoh = getDohServerForDomain(domain);

    // Reuse the array buffer directly
    return fetch(targetDoh, {
      method: "POST",
      headers: {
        Accept: contype,
        "Content-Type": contype,
      },
      body: arrayBuffer,
    });
  }

  // Default case: not found
  return new Response("Not Found. HTTP 404.", { status: 404 });
}
