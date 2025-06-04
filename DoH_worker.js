addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

// Configuration
const DOH_ENDPOINT = "/dns-query";
const TEST_ENDPOINT = "/test-location";

// Multiple DoH servers for load balancing and redundancy
const DOH_SERVERS = [
  "https://cloudflare-dns.com/dns-query",
  "https://dns.google/dns-query",
  "https://1.1.1.1/dns-query",
];

// Simple round-robin counter
let serverIndex = 0;

// Get next DoH server (round-robin)
function getNextDohServer() {
  const server = DOH_SERVERS[serverIndex];
  serverIndex = (serverIndex + 1) % DOH_SERVERS.length;
  return server;
}

// Optimized headers - pre-built for performance
const GET_HEADERS = {
  Accept: "application/dns-message",
  "Cache-Control": "max-age=300",
};

const POST_HEADERS = {
  Accept: "application/dns-message",
  "Content-Type": "application/dns-message",
  "Cache-Control": "max-age=300",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
};

// Fast CORS response
const CORS_RESPONSE = new Response(null, {
  status: 200,
  headers: CORS_HEADERS,
});

// Optimized response creation
function createFastResponse(response) {
  const headers = new Headers();

  // Copy essential headers only
  const contentType = response.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const contentLength = response.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);

  // Add caching for better performance
  headers.set("cache-control", "public, max-age=300");
  headers.set("access-control-allow-origin", "*");

  return new Response(response.body, {
    status: response.status,
    headers: headers,
  });
}

// Parallel DNS resolution with fallback
async function parallelDnsQuery(url, options) {
  const promises = DOH_SERVERS.map((server) => {
    const targetUrl = url.replace(DOH_SERVERS[0], server);
    return fetch(targetUrl, {
      ...options,
      // Add timeout and performance optimizations
      cf: {
        cacheTtl: 300,
        cacheEverything: true,
      },
    }).catch((err) => ({ error: err.message, server }));
  });

  // Return first successful response
  const results = await Promise.allSettled(promises);

  for (const result of results) {
    if (
      result.status === "fulfilled" &&
      !result.value.error &&
      result.value.ok
    ) {
      return result.value;
    }
  }

  // If all failed, throw error
  throw new Error("All DoH servers failed");
}

// Fast DoH GET handler
async function handleDohGet(url) {
  const dnsParam = url.searchParams.get("dns");
  if (!dnsParam) {
    return new Response("Missing dns parameter", { status: 400 });
  }

  try {
    // Use fastest available server
    const targetServer = getNextDohServer();
    const targetUrl = `${targetServer}?dns=${dnsParam}`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: GET_HEADERS,
      cf: {
        cacheTtl: 300,
        cacheEverything: true,
      },
    });

    if (!response.ok && DOH_SERVERS.length > 1) {
      // Try parallel query if primary fails
      return createFastResponse(
        await parallelDnsQuery(targetUrl, {
          method: "GET",
          headers: GET_HEADERS,
        })
      );
    }

    return createFastResponse(response);
  } catch (error) {
    return new Response("DNS resolution failed", {
      status: 502,
      headers: { "access-control-allow-origin": "*" },
    });
  }
}

// Fast DoH POST handler
async function handleDohPost(request) {
  const contentType = request.headers.get("content-type");
  if (contentType !== "application/dns-message") {
    return new Response("Invalid content type", { status: 400 });
  }

  try {
    // Read body once and reuse
    const bodyBuffer = await request.arrayBuffer();
    const targetServer = getNextDohServer();

    const response = await fetch(targetServer, {
      method: "POST",
      headers: POST_HEADERS,
      body: bodyBuffer,
      cf: {
        cacheTtl: 300,
        cacheEverything: true,
      },
    });

    if (!response.ok && DOH_SERVERS.length > 1) {
      // Try parallel query if primary fails
      const promises = DOH_SERVERS.slice(1).map((server) =>
        fetch(server, {
          method: "POST",
          headers: POST_HEADERS,
          body: bodyBuffer,
          cf: { cacheTtl: 300, cacheEverything: true },
        }).catch((err) => ({ error: err.message }))
      );

      const results = await Promise.allSettled(promises);
      for (const result of results) {
        if (
          result.status === "fulfilled" &&
          !result.value.error &&
          result.value.ok
        ) {
          return createFastResponse(result.value);
        }
      }
    }

    return createFastResponse(response);
  } catch (error) {
    return new Response("DNS resolution failed", {
      status: 502,
      headers: { "access-control-allow-origin": "*" },
    });
  }
}

// Simplified location test
async function handleLocationTest() {
  try {
    const response = await fetch("https://httpbin.org/ip", {
      headers: { "User-Agent": "DoH-Test/1.0" },
      cf: { cacheTtl: 60 },
    });

    const data = await response.json();

    return new Response(
      JSON.stringify(
        {
          message: "Server Location Test",
          ip: data.origin,
          timestamp: new Date().toISOString(),
          status: "success",
        },
        null,
        2
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: "Test failed",
        error: error.message,
        status: "error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// Main request handler - optimized for speed
async function handleRequest(request) {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;

  // Fast CORS handling
  if (method === "OPTIONS") {
    return CORS_RESPONSE;
  }

  // Fast routing with early returns
  switch (pathname) {
    case DOH_ENDPOINT:
      return method === "GET"
        ? handleDohGet(url)
        : method === "POST"
        ? handleDohPost(request)
        : new Response("Method not allowed", { status: 405 });

    case TEST_ENDPOINT:
      return handleLocationTest();

    case "/":
    case "/health":
      return new Response(
        JSON.stringify({
          service: "DoH Proxy",
          status: "healthy",
          servers: DOH_SERVERS.length,
          timestamp: Date.now(),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=60",
          },
        }
      );

    default:
      return new Response("Not Found", { status: 404 });
  }
}
