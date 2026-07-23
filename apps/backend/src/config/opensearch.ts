import { Client } from "@opensearch-project/opensearch";
import { env } from "./env.js";

let client: Client | undefined;

export function getOpenSearchClient(): Client {
  client ??= new Client({
    node: env.openSearchUrl,
    requestTimeout: env.openSearchTimeoutMs,
    maxRetries: 2
  });
  return client;
}

export async function closeOpenSearchClient() {
  if (!client) return;
  await client.close();
  client = undefined;
}
