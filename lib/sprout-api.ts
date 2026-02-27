import type { SproutProfile } from './types';

const BASE_URL = 'https://api.sproutsocial.com/v1';
const OAUTH_TOKEN_URL =
  'https://identity.sproutsocial.com/oauth2/84e39c75-d770-45d9-90a9-7b79e3037d2c/v1/token';
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

// --- OAuth token cache ---
let cachedOAuthToken: string | null = null;
let oauthTokenExpiresAt = 0;

// --- Sprout API response types ---

export interface SproutProfileAnalyticsRow {
  dimensions: {
    'reporting_period.by(day)': string;
    customer_profile_id: number;
  };
  metrics: Record<string, number | null>;
}

export interface SproutProfileAnalyticsResponse {
  data: SproutProfileAnalyticsRow[];
  paging?: { current_page: number; total_pages: number };
}

export interface SproutPostRow {
  text?: string;
  perma_link?: string;
  created_time?: string;
  network_type?: string;
  customer_profile_id?: number | string;
  profile_guid?: string;
  guid?: string;
  sent?: boolean;
  metrics: Record<string, number | null>;
}

export interface SproutPostAnalyticsResponse {
  data: SproutPostRow[];
  paging?: { current_page: number; total_pages: number };
}

export interface SproutCustomerInfo {
  customer_id: number;
  name: string;
}

// ---

class SproutApiClient {
  private apiKey: string;
  private oauthClientId: string;
  private oauthClientSecret: string;
  private customerId: string;

  constructor() {
    this.apiKey = process.env.SPROUT_API_KEY ?? '';
    this.oauthClientId = process.env.SPROUT_OAUTH_CLIENT_ID ?? '';
    this.oauthClientSecret = process.env.SPROUT_OAUTH_CLIENT_SECRET ?? '';
    this.customerId = process.env.SPROUT_CUSTOMER_ID ?? '';
  }

  /** True if we have enough credentials to make API calls. */
  isConfigured(): boolean {
    const hasOAuth = Boolean(this.oauthClientId && this.oauthClientSecret);
    const hasStaticToken = Boolean(this.apiKey);
    return hasOAuth || hasStaticToken;
  }

  /** Returns the customer ID, discovering it via API if not set in env. */
  async getCustomerId(): Promise<string> {
    if (this.customerId) return this.customerId;

    // Try decoding from the static API key first (format: customer_id|timestamp|uuid in base64)
    if (this.apiKey) {
      try {
        const decoded = Buffer.from(this.apiKey, 'base64').toString('utf-8');
        const parts = decoded.split('|');
        if (parts.length >= 1 && /^\d+$/.test(parts[0])) {
          this.customerId = parts[0];
          console.log(`[Sprout] Customer ID decoded from token: ${this.customerId}`);
          return this.customerId;
        }
      } catch {
        // Not a base64 token — fall through to API discovery
      }
    }

    // Fall back to API discovery
    console.log('[Sprout] Trying API discovery for customer ID...');
    const token = await this.getAccessToken();
    const response = await fetch(`${BASE_URL}/metadata/client`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to discover customer ID: ${response.status} ${errorBody}`
      );
    }

    const result = (await response.json()) as { data: SproutCustomerInfo[] };
    if (!result.data?.length) {
      throw new Error('No customers found for this API token');
    }

    this.customerId = String(result.data[0].customer_id);
    console.log(
      `[Sprout] Discovered customer ID: ${this.customerId} (${result.data[0].name})`
    );
    return this.customerId;
  }

  // --- OAuth M2M token exchange ---

  private get useOAuth(): boolean {
    return Boolean(this.oauthClientId && this.oauthClientSecret);
  }

  private async exchangeOAuthToken(): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.oauthClientId,
      client_secret: this.oauthClientSecret,
    });

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OAuth token exchange failed: ${response.status} ${errorBody}`
      );
    }

    return response.json();
  }

  /**
   * Returns a valid Bearer token.
   * Prefers static API key (proven to work with data endpoints).
   * Falls back to OAuth if no static key.
   */
  async getAccessToken(): Promise<string> {
    // Prefer static API key — OAuth tokens may not have the right scopes
    // for data endpoints (metadata/customer, analytics/*)
    if (this.apiKey) {
      return this.apiKey;
    }

    if (!this.useOAuth) {
      throw new Error('No Sprout API credentials configured');
    }

    // Check cached OAuth token
    if (cachedOAuthToken && Date.now() < oauthTokenExpiresAt - 60_000) {
      return cachedOAuthToken;
    }

    console.log('[Sprout] Exchanging OAuth credentials for access token...');
    const result = await this.exchangeOAuthToken();
    cachedOAuthToken = result.access_token;
    oauthTokenExpiresAt = Date.now() + result.expires_in * 1000;
    console.log(
      `[Sprout] OAuth token obtained, expires in ${result.expires_in}s`
    );
    return cachedOAuthToken;
  }

  // --- Core request helper ---

  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: object,
    retries = 0
  ): Promise<unknown> {
    const customerId = await this.getCustomerId();
    const token = await this.getAccessToken();
    const url = `${BASE_URL}/${customerId}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Rate-limit retry with exponential backoff
    if (response.status === 429 && retries < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, retries);
      console.warn(
        `[Sprout] Rate limited. Retrying in ${backoff}ms (attempt ${retries + 1}/${MAX_RETRIES})`
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return this.request(method, path, body, retries + 1);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Sprout API error ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  // --- Public API methods ---

  async getProfiles(): Promise<SproutProfile[]> {
    const data = (await this.request('GET', '/metadata/customer')) as {
      data: SproutProfile[];
    };
    return data.data ?? [];
  }

  async getProfileAnalytics(
    profileIds: number[],
    startDate: string,
    endDate: string,
    metrics: string[],
    page = 1,
    limit = 1000
  ): Promise<SproutProfileAnalyticsResponse> {
    return this.request('POST', '/analytics/profiles', {
      filters: [
        `customer_profile_id.eq(${profileIds.join(',')})`,
        `reporting_period.in(${startDate}...${endDate})`,
      ],
      metrics,
      dimensions: ['customer_profile_id', 'reporting_period.by(day)'],
      page,
      limit,
    }) as Promise<SproutProfileAnalyticsResponse>;
  }

  /**
   * Fetch ALL pages of profile analytics, auto-paginating.
   * Fetches in batches of profiles to avoid hitting the 1000-row limit per page.
   * Each batch contains up to 2 profiles × 365 days ≈ 730 rows (under 1000 limit).
   */
  async getAllProfileAnalytics(
    profileIds: number[],
    startDate: string,
    endDate: string,
    metrics: string[]
  ): Promise<SproutProfileAnalyticsRow[]> {
    const allRows: SproutProfileAnalyticsRow[] = [];

    // Batch profiles in groups of 2 to stay well under the 1000-row-per-page limit
    // (2 profiles × 365 days = 730 rows per batch)
    const BATCH_SIZE = 2;
    const batches: number[][] = [];
    for (let i = 0; i < profileIds.length; i += BATCH_SIZE) {
      batches.push(profileIds.slice(i, i + BATCH_SIZE));
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await this.getProfileAnalytics(
          batch,
          startDate,
          endDate,
          metrics,
          page,
          1000
        );
        allRows.push(...response.data);
        totalPages = response.paging?.total_pages ?? 1;
        console.log(
          `[Sprout] Profile analytics batch ${batchIdx + 1}/${batches.length}, ` +
          `page ${page}/${totalPages} (${allRows.length} total rows)`
        );
        page++;
      } while (page <= totalPages);
    }

    return allRows;
  }

  async getPostAnalytics(
    profileIds: number[],
    startDate: string,
    endDate: string,
    metrics: string[],
    fields: string[],
    page = 1,
    limit = 50,
    sort?: string[]
  ): Promise<SproutPostAnalyticsResponse> {
    return this.request('POST', '/analytics/posts', {
      filters: [
        `customer_profile_id.eq(${profileIds.join(',')})`,
        `created_time.in(${startDate}T00:00:00..${endDate}T23:59:59)`,
      ],
      metrics,
      fields,
      page,
      limit,
      sort,
      timezone: 'Africa/Johannesburg',
    }) as Promise<SproutPostAnalyticsResponse>;
  }

  /** Fetch ALL pages of post analytics, auto-paginating. */
  async getAllPostAnalytics(
    profileIds: number[],
    startDate: string,
    endDate: string,
    metrics: string[],
    fields: string[],
    sort?: string[]
  ): Promise<SproutPostRow[]> {
    const allPosts: SproutPostRow[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await this.getPostAnalytics(
        profileIds,
        startDate,
        endDate,
        metrics,
        fields,
        page,
        50,
        sort
      );
      allPosts.push(...response.data);
      totalPages = response.paging?.total_pages ?? 1;
      page++;
      console.log(
        `[Sprout] Fetched posts page ${page - 1}/${totalPages} (${allPosts.length} total)`
      );
    } while (page <= totalPages);

    return allPosts;
  }
}

let client: SproutApiClient | null = null;

export function getSproutClient(): SproutApiClient {
  if (!client) {
    client = new SproutApiClient();
  }
  return client;
}
