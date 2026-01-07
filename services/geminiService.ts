
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_NAMES } from "../constants";
import { ExtractedTruckData, RegistrationData, EngineTagData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const repairVin = (vin: string): string => {
    let repaired = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    repaired = repaired.replace(/[OQ]/g, '0');
    repaired = repaired.replace(/[I]/g, '1');
    return repaired;
};

// Added VIN check digit validation logic (Checksum algorithm)
export const validateVINCheckDigit = (vin: string): boolean => {
    if (vin.length !== 17) return false;
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const translit: Record<string, number> = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
        'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9
    };
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
        const char = vin[i];
        let val: number;
        if (/[0-9]/.test(char)) {
            val = parseInt(char);
        } else {
            val = translit[char] || 0;
        }
        sum += val * weights[i];
    }
    
    const remainder = sum % 11;
    const checkDigit = remainder === 10 ? 'X' : remainder.toString();
    return vin[8] === checkDigit;
};

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const processBatchIntake = async (files: File[]): Promise<ExtractedTruckData> => {
    const parts = await Promise.all(files.map(async (file) => {
        const b64 = await fileToBase64(file);
        return { inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } };
    }));

    const prompt = `
        Analyze these multiple images from a truck inspection. 
        Identify the content across all images (VIN label, Engine Tag, Registration, Odometer/Dash).
        Extract a UNIFIED record based on this specific template:
        - Inspection Date (if visible)
        - VIN (Never I, O, Q)
        - Odometer/Mileage
        - License Plate
        - Engine Family Name (CRITICAL 12-char ID)
        - Engine Manufacturer
        - Engine Model
        - Engine Year
        - Emission Components Status (EGR, SCR, TWC, NOx, SC/TC, ECM/PCM, DPF - mark as 'P' if passing/present)
        
        Combine data from all images into ONE JSON object. If a field is missing, leave it empty.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: { parts: [...parts, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        vin: { type: Type.STRING },
                        licensePlate: { type: Type.STRING },
                        mileage: { type: Type.STRING },
                        engineFamilyName: { type: Type.STRING },
                        engineManufacturer: { type: Type.STRING },
                        engineModel: { type: Type.STRING },
                        engineYear: { type: Type.STRING },
                        inspectionDate: { type: Type.STRING },
                        egr: { type: Type.STRING },
                        scr: { type: Type.STRING },
                        twc: { type: Type.STRING },
                        nox: { type: Type.STRING },
                        sctc: { type: Type.STRING },
                        ecmPcm: { type: Type.STRING },
                        dpf: { type: Type.STRING }
                    },
                    propertyOrdering: ["vin", "licensePlate", "mileage", "engineFamilyName", "engineManufacturer", "engineModel", "engineYear", "inspectionDate", "egr", "scr", "twc", "nox", "sctc", "ecmPcm", "dpf"]
                }
            }
        });
        const json = JSON.parse(response.text || '{}');
        if (json.vin) json.vin = repairVin(json.vin);
        return json;
    } catch (e) {
        console.error("Batch Extraction Error:", e);
        throw e;
    }
};

export const identifyAndExtractData = async (file: File | Blob): Promise<ExtractedTruckData> => {
    const b64 = await fileToBase64(file);
    const prompt = `Analyze document and extract JSON. Types: VIN_LABEL, REGISTRATION, ENGINE_TAG, ODOMETER.`;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAMES.FLASH,
            contents: { parts: [{ inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        documentType: { type: Type.STRING, enum: ['VIN_LABEL', 'REGISTRATION', 'ENGINE_TAG', 'ODOMETER', 'UNKNOWN'] },
                        vin: { type: Type.STRING },
                        licensePlate: { type: Type.STRING },
                        mileage: { type: Type.STRING },
                        engineFamilyName: { type: Type.STRING },
                        engineModel: { type: Type.STRING },
                        engineYear: { type: Type.STRING },
                        confidence: { type: Type.STRING }
                    },
                    propertyOrdering: ["documentType", "vin", "licensePlate", "mileage", "engineFamilyName", "engineModel", "engineYear", "confidence"]
                }
            }
        });
        const json = JSON.parse(response.text || '{}');
        if (json.vin) json.vin = repairVin(json.vin);
        return json;
    } catch (e) { return { documentType: 'UNKNOWN' }; }
};

export const extractVinAndPlateFromImage = async (file: File | Blob) => {
    const b64 = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH,
        contents: { parts: [{ inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } }, { text: "Extract VIN and Plate JSON." }] },
        config: { responseMimeType: "application/json" }
    });
    const json = JSON.parse(response.text || '{}');
    return { vin: repairVin(json.vin || ''), plate: json.plate || '', confidence: 'high' };
};

export const extractRegistrationData = async (file: File | Blob): Promise<RegistrationData> => {
    const b64 = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH,
        contents: { parts: [{ inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } }, { text: "Extract Registration JSON." }] },
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
};

export const extractEngineTagData = async (file: File | Blob): Promise<EngineTagData> => {
    const b64 = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH,
        contents: { parts: [{ inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } }, { text: "Extract Engine Tag JSON." }] },
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
};

export const sendMessage = async (text: string, mode: any, history: any[]) => {
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH,
        contents: [...history, { role: 'user', parts: [{ text }] }],
        config: { 
            systemInstruction: "You are VIN DIESEL AI, an expert in California Air Resources Board (CARB) Clean Truck Check (CTC) regulations. You only answer questions related to CARB regulations, testing protocols, and compliance deadlines.",
            tools: [{ googleSearch: {} }] 
        }
    });

    const groundingUrls = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter(chunk => chunk.web)
        ?.map(chunk => ({
            uri: chunk.web?.uri || '',
            title: chunk.web?.title || ''
        }));

    return { 
        text: response.text || '',
        groundingUrls: groundingUrls || []
    };
};
