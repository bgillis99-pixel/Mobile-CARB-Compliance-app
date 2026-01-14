export type ComplianceStatus = 'COMPLIANT' | 'NOT_COMPLIANT' | 'UNKNOWN';

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_COMPLIANCE_WEBHOOK || '';

export async function lookupCompliance(vin: string): Promise<{ status: ComplianceStatus; raw: any }> {
  if (!vin || vin.length < 17) {
    return {
      status: 'UNKNOWN',
      raw: { error: 'Invalid VIN - must be 17 characters', timestamp: new Date().toISOString() }
    };
  }

  // Use Make.com webhook to scrape cleantruckcheck.arb.ca.gov
  if (MAKE_WEBHOOK_URL) {
    try {
      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin, timestamp: new Date().toISOString() })
      });

      if (!response.ok) {
        throw new Error(`Make webhook returned ${response.status}`);
      }

      const data = await response.json();

      let status: ComplianceStatus = 'UNKNOWN';
      if (data.compliant === true || data.status?.toLowerCase() === 'compliant') {
        status = 'COMPLIANT';
      } else if (data.compliant === false || data.status?.toLowerCase().includes('not')) {
        status = 'NOT_COMPLIANT';
      }

      return {
        status,
        raw: {
          source: 'CARB_VIA_MAKE',
          timestamp: new Date().toISOString(),
          ...data
        }
      };
    } catch (error) {
      console.error('Make webhook error:', error);
      return {
        status: 'UNKNOWN',
        raw: {
          source: 'CARB_VIA_MAKE',
          error: error instanceof Error ? error.message : 'Webhook failed',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Fallback: Direct fetch attempt to CARB (may be blocked by CORS in browser)
  try {
    const carbUrl = `https://cleantruckcheck.arb.ca.gov/api/vehicle/${vin}`;
    const response = await fetch(carbUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      let status: ComplianceStatus = 'UNKNOWN';
      if (data.isCompliant || data.complianceStatus === 'Compliant') {
        status = 'COMPLIANT';
      } else if (data.isCompliant === false || data.complianceStatus?.includes('Not')) {
        status = 'NOT_COMPLIANT';
      }
      return { status, raw: { source: 'CARB_DIRECT', ...data, timestamp: new Date().toISOString() } };
    }
  } catch {
    // CORS blocked or network error - expected in browser context
  }

  return {
    status: 'UNKNOWN',
    raw: {
      source: 'NO_WEBHOOK_CONFIGURED',
      timestamp: new Date().toISOString(),
      note: 'Set NEXT_PUBLIC_MAKE_COMPLIANCE_WEBHOOK env var to enable CARB lookups'
    }
  };
}
