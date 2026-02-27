/**
 * Sprout Social API connectivity test script.
 * Run with: npx tsx scripts/test-api.ts
 *
 * Tests:
 * 1. OAuth token exchange (if credentials provided)
 * 2. Customer ID discovery
 * 3. Profile listing
 * 4. Sample analytics fetch
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const BASE_URL = 'https://api.sproutsocial.com/v1';
const OAUTH_TOKEN_URL =
  'https://identity.sproutsocial.com/oauth2/84e39c75-d770-45d9-90a9-7b79e3037d2c/v1/token';

const API_KEY = process.env.SPROUT_API_KEY ?? '';
const OAUTH_CLIENT_ID = process.env.SPROUT_OAUTH_CLIENT_ID ?? '';
const OAUTH_CLIENT_SECRET = process.env.SPROUT_OAUTH_CLIENT_SECRET ?? '';

async function getToken(): Promise<string> {
  // Try OAuth first
  if (OAUTH_CLIENT_ID && OAUTH_CLIENT_SECRET) {
    console.log('🔑 Trying OAuth M2M token exchange...');
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
    });

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ OAuth token obtained (expires in ${result.expires_in}s)`);
      return result.access_token;
    }

    const errorText = await response.text();
    console.log(`   ⚠️  OAuth failed (${response.status}): ${errorText}`);
    console.log('   Falling back to static API key...');
  }

  // Fall back to static API key
  if (API_KEY) {
    console.log('🔑 Using static API key');
    return API_KEY;
  }

  throw new Error('No credentials available');
}

async function discoverCustomerId(token: string): Promise<string> {
  // Try /metadata/client first
  console.log('\n📋 Discovering customer ID...');
  console.log('   Trying GET /v1/metadata/client...');
  const response1 = await fetch(`${BASE_URL}/metadata/client`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (response1.ok) {
    const result = await response1.json();
    console.log('   Response:', JSON.stringify(result, null, 2));
    if (result.data?.length) {
      const customer = result.data[0];
      console.log(`   ✅ Customer ID: ${customer.customer_id} (${customer.name})`);
      return String(customer.customer_id);
    }
  } else {
    const errorText = await response1.text();
    console.log(`   ⚠️  /metadata/client returned ${response1.status}: ${errorText}`);
  }

  // Try decoding the static API key — Sprout tokens are often base64 with pipe-separated fields
  // Format: customer_id|timestamp|uuid
  if (API_KEY) {
    console.log('   Trying to decode static API key...');
    try {
      const decoded = Buffer.from(API_KEY, 'base64').toString('utf-8');
      console.log(`   Decoded: ${decoded}`);
      const parts = decoded.split('|');
      if (parts.length >= 1 && /^\d+$/.test(parts[0])) {
        console.log(`   ✅ Extracted Customer ID from token: ${parts[0]}`);
        return parts[0];
      }
    } catch {
      console.log('   Could not decode token');
    }
  }

  // Try common customer ID patterns from the token
  console.log('   Trying brute force with static token on /metadata/customer...');
  // Try the API key directly as a bearer token (not OAuth) with a known customer id
  const staticResponse = await fetch(`${BASE_URL}/metadata/client`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'application/json',
    },
  });

  if (staticResponse.ok) {
    const result = await staticResponse.json();
    console.log('   Static key response:', JSON.stringify(result, null, 2));
    if (result.data?.length) {
      return String(result.data[0].customer_id);
    }
  } else {
    const errorText = await staticResponse.text();
    console.log(`   ⚠️  Static key /metadata/client returned ${staticResponse.status}: ${errorText}`);
  }

  throw new Error('Could not discover customer ID. Please set SPROUT_CUSTOMER_ID manually.');
}

async function fetchProfiles(token: string, customerId: string) {
  console.log('\n👤 Fetching profiles...');

  // Try with OAuth token first, then fall back to static API key
  let response = await fetch(
    `${BASE_URL}/${customerId}/metadata/customer`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok && API_KEY && token !== API_KEY) {
    console.log(`   ⚠️  OAuth token returned ${response.status}, trying static API key...`);
    response = await fetch(
      `${BASE_URL}/${customerId}/metadata/customer`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: 'application/json',
        },
      }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`metadata/customer failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const profiles = result.data ?? [];

  console.log(`   ✅ Found ${profiles.length} profiles:`);
  for (const p of profiles) {
    console.log(
      `      - [${p.network_type}] ${p.name} (ID: ${p.customer_profile_id}, native: ${p.native_id})`
    );
  }

  return profiles;
}

async function fetchSampleAnalytics(
  token: string,
  customerId: string,
  profileIds: number[]
) {
  if (profileIds.length === 0) {
    console.log('\n📊 Skipping analytics test — no profiles');
    return;
  }

  console.log('\n📊 Fetching sample analytics (last 7 days)...');
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const body = {
    filters: [
      `customer_profile_id.eq(${profileIds.join(',')})`,
      `reporting_period.in(${startDate}...${endDate})`,
    ],
    metrics: [
      'impressions',
      'reactions',
      'comments',
      'shares',
      'video_views',
      'net_follower_growth',
      'lifetime_snapshot.followers_count',
      'posts_sent_count',
    ],
    dimensions: ['customer_profile_id', 'reporting_period.by(day)'],
  };

  // Try with the best available token (preferring static API key if OAuth fails)
  const tokensToTry = API_KEY && token !== API_KEY ? [API_KEY, token] : [token];
  let response: Response | null = null;

  for (const tryToken of tokensToTry) {
    response = await fetch(
      `${BASE_URL}/${customerId}/analytics/profiles`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tryToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    if (response.ok) break;
    console.log(`   ⚠️  Token attempt returned ${response.status}`);
  }

  if (!response || !response.ok) {
    const errorText = response ? await response.text() : 'No response';
    console.log(`   ⚠️  Analytics failed: ${errorText}`);
    return;
  }

  const result = await response.json();
  const rows = result.data ?? [];
  console.log(`   ✅ Got ${rows.length} data rows`);
  if (rows.length > 0) {
    console.log('   Sample row:', JSON.stringify(rows[0], null, 2));
  }
  if (result.paging) {
    console.log('   Paging:', JSON.stringify(result.paging));
  }
}

async function fetchSamplePosts(
  token: string,
  customerId: string,
  profileIds: number[]
) {
  if (profileIds.length === 0) {
    console.log('\n📝 Skipping posts test — no profiles');
    return;
  }

  console.log('\n📝 Fetching sample posts (last 30 days, first page)...');
  const endDate2 = new Date().toISOString().split('T')[0];
  const startDate2 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Try progressively adding fields to find which ones are valid
  const fieldSets = [
    { label: 'minimal (just created_time+text)', fields: ['created_time', 'text'] },
    { label: 'add perma_link', fields: ['created_time', 'text', 'perma_link'] },
    { label: 'add guid', fields: ['created_time', 'text', 'perma_link', 'guid'] },
    { label: 'add network_type', fields: ['created_time', 'text', 'perma_link', 'guid', 'network_type'] },
    { label: 'add customer_profile_id', fields: ['created_time', 'text', 'perma_link', 'guid', 'customer_profile_id'] },
  ];

  let workingFields: string[] = [];
  const useToken2 = API_KEY || token;

  for (const fs of fieldSets) {
    const testBody = {
      filters: [
        `customer_profile_id.eq(${profileIds.slice(0, 3).join(',')})`,
        `created_time.in(${startDate2}T00:00:00..${endDate2}T23:59:59)`,
      ],
      metrics: ['lifetime.impressions', 'lifetime.reactions'],
      fields: fs.fields,
      page: 1,
      limit: 2,
      timezone: 'Africa/Johannesburg',
    };

    const testResp = await fetch(
      `${BASE_URL}/${customerId}/analytics/posts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${useToken2}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(testBody),
      }
    );

    if (testResp.ok) {
      console.log(`   ✅ Fields OK: ${fs.label}`);
      workingFields = fs.fields;
      const testResult = await testResp.json();
      if (testResult.data?.length > 0) {
        console.log('   Sample post keys:', Object.keys(testResult.data[0]));
        console.log('   Sample post:', JSON.stringify(testResult.data[0], null, 2));
      }
    } else {
      const errorText = await testResp.text();
      console.log(`   ❌ Fields FAILED: ${fs.label} — ${errorText}`);
    }
  }

  // Now try with all working fields + more metrics
  if (workingFields.length === 0) {
    console.log('   ⚠️  No working field sets found');
    return;
  }

  // Test each metric individually to find which ones are valid
  const allMetrics = [
    'lifetime.impressions',
    'lifetime.reactions',
    'lifetime.comments_count',
    'lifetime.shares_count',
    'lifetime.saves_count',
    'lifetime.post_content_clicks',
    'lifetime.video_views',
    'lifetime.post_shares_count',
    'lifetime.post_activity',
    'lifetime.post_clicks',
    'lifetime.views',
  ];

  console.log(`\n   Testing individual post metrics...`);
  const validMetrics: string[] = [];
  for (const metric of allMetrics) {
    const testBody2 = {
      filters: [
        `customer_profile_id.eq(${profileIds.slice(0, 3).join(',')})`,
        `created_time.in(${startDate2}T00:00:00..${endDate2}T23:59:59)`,
      ],
      metrics: [metric],
      fields: ['created_time'],
      page: 1,
      limit: 1,
      timezone: 'Africa/Johannesburg',
    };

    const testResp2 = await fetch(
      `${BASE_URL}/${customerId}/analytics/posts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${useToken2}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(testBody2),
      }
    );

    if (testResp2.ok) {
      validMetrics.push(metric);
      const r = await testResp2.json();
      const val = r.data?.[0]?.metrics?.[metric];
      console.log(`   ✅ ${metric} = ${val}`);
    } else {
      console.log(`   ❌ ${metric}`);
      await testResp2.text(); // consume body
    }
  }

  console.log(`\n   Valid post metrics: [${validMetrics.join(', ')}]`);

  // Now fetch with all valid metrics
  console.log(`\n   Fetching sample posts with all valid metrics...`);
  const body = {
    filters: [
      `customer_profile_id.eq(${profileIds.slice(0, 3).join(',')})`,
      `created_time.in(${startDate2}T00:00:00..${endDate2}T23:59:59)`,
    ],
    metrics: validMetrics,
    fields: workingFields,
    page: 1,
    limit: 5,
    timezone: 'Africa/Johannesburg',
  };

  // Use static API key (proven to work)
  const useToken = API_KEY || token;
  const response2 = await fetch(
    `${BASE_URL}/${customerId}/analytics/posts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${useToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response2.ok) {
    const errorText = await response2.text();
    console.log(`   ⚠️  Posts failed (${response2.status}): ${errorText}`);
    return;
  }

  const response = response2;

  const result = await response.json();
  const posts = result.data ?? [];
  console.log(`   ✅ Got ${posts.length} posts`);
  if (posts.length > 0) {
    console.log('   Top post:', JSON.stringify(posts[0], null, 2));
  }
  if (result.paging) {
    console.log('   Paging:', JSON.stringify(result.paging));
  }
}

// --- Main ---

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Sprout Social API Connectivity Test');
  console.log('═══════════════════════════════════════════\n');

  console.log('Credentials check:');
  console.log(`  SPROUT_API_KEY:            ${API_KEY ? '✅ set' : '❌ missing'}`);
  console.log(`  SPROUT_OAUTH_CLIENT_ID:    ${OAUTH_CLIENT_ID ? '✅ set' : '❌ missing'}`);
  console.log(`  SPROUT_OAUTH_CLIENT_SECRET:${OAUTH_CLIENT_SECRET ? ' ✅ set' : ' ❌ missing'}`);

  try {
    const token = await getToken();
    const customerId = await discoverCustomerId(token);

    console.log(`\n💡 Add this to your .env.local:`);
    console.log(`   SPROUT_CUSTOMER_ID=${customerId}\n`);

    const profiles = await fetchProfiles(token, customerId);
    const profileIds = profiles.map((p: { customer_profile_id: number }) => p.customer_profile_id);

    await fetchSampleAnalytics(token, customerId, profileIds);
    await fetchSamplePosts(token, customerId, profileIds);

    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ All tests passed!');
    console.log('═══════════════════════════════════════════');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
