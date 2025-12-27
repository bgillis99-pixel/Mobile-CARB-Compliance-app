
// NHTSA vPIC API Service (Free Federal API)
// Used to verify Year, Make, Model from VIN before checking CARB status.

export interface NHTSAVehicle {
  year: string;
  make: string;
  model: string;
  gvwr: string;
  engineMfr: string;
  errorCode: string;
  valid: boolean;
}

/**
 * Decodes a VIN using the NHTSA vPIC API.
 * Maps federal variables to app-specific fields for CARB compliance checks.
 */
export const decodeVinNHTSA = async (vin: string): Promise<NHTSAVehicle | null> => {
  if (!vin || vin.length !== 17) return null;

  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.Results) return null;

    const results: Record<string, string> = {};
    data.Results.forEach((item: any) => {
      if (item.Value && item.Value !== "Not Applicable") {
        results[item.Variable] = item.Value;
      }
    });

    // Mapping to requested field names
    const mapped: NHTSAVehicle = {
      year: results["Model Year"] || 'Unknown',
      make: results["Make"] || 'Unknown',
      model: results["Model"] || 'Unknown',
      gvwr: results["Gross Vehicle Weight Rating"] || results["GVWR"] || 'Unknown',
      engineMfr: results["Engine Manufacturer"] || 'Unknown',
      errorCode: results["Error Code"] || "0",
      valid: results["Error Code"] === "0"
    };

    return mapped;
  } catch (e) {
    console.error("NHTSA API Error:", e);
    return null;
  }
};
