
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MODEL_NAMES, ASPECT_RATIOS } from "../constants";
import { ExtractedTruckData, RegistrationData, EngineTagData } from "../types";
import { MILA_MUSK_SYSTEM_PROMPT } from "../prompts/mila";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("SYSTEM_ERROR: Gemini API Key is missing. Check your environment settings.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const repairVin = (vin: string): string => {
    let repaired = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
    repaired = repaired.replace(/[OQ]/g, '0');
    repaired = repaired.replace(/[I]/g, '1');
    return repaired;
};

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
    const ai = getAiClient();
    const parts = await Promise.all(files.map(async (file) => {
        const b64 = await fileToBase64(file);
        return { inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } };
    }));

    const prompt = `Analyze these truck inspection images (VIN labels, engine tags, registration docs). Extract and consolidate all available data points into a single, unified JSON record. Prioritize accuracy.`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAMES.PRO, // Upgraded for higher accuracy on complex documents
            contents: { parts: [...parts, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        vin: { type: Type.STRING, description: "17-character Vehicle Identification Number" },
                        licensePlate: { type: Type.STRING },
                        mileage: { type: Type.STRING },
                        engineFamilyName: { type: Type.STRING, description: "Engine Family Name or ID" },
                        engineManufacturer: { type: Type.STRING },
                        engineModel: { type: Type.STRING },
                        engineYear: { type: Type.STRING }
                    }
                }
            }
        });
        const json = JSON.parse(response.text || '{}');
        if (json.vin) json.vin = repairVin(json.vin);
        return json;
    } catch (e) { throw e; }
};

export const identifyAndExtractData = async (file: File | Blob): Promise<ExtractedTruckData> => {
    const ai = getAiClient();
    const b64 = await fileToBase64(file);
    const prompt = `Analyze the document image. Identify the document type (e.g., VIN Label, Registration, Engine Tag) and extract all relevant compliance data into a structured JSON format.`;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAMES.PRO, // Upgraded for better document understanding
            contents: { parts: [{ inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        documentType: { type: Type.STRING },
                        vin: { type: Type.STRING },
                        licensePlate: { type: Type.STRING },
                        mileage: { type: Type.STRING }
                    }
                }
            }
        });
        const json = JSON.parse(response.text || '{}');
        if (json.vin) json.vin = repairVin(json.vin);
        return json;
    } catch (e) { return {}; }
};

export const extractVinAndPlateFromImage = async (file: File | Blob) => {
    const ai = getAiClient();
    const b64 = await fileToBase64(file);
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH, // Flash is sufficient for this specific task
        contents: { parts: [{ inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } }, { text: "Extract VIN and License Plate into a JSON object with 'vin' and 'plate' keys." }] },
        config: { responseMimeType: "application/json" }
    });
    const json = JSON.parse(response.text || '{}');
    return { vin: repairVin(json.vin || ''), plate: json.plate || '', confidence: 'high' };
};

export const extractRegistrationData = async (file: File | Blob): Promise<RegistrationData> => {
    // This function can be merged into the more generic identifyAndExtractData
    return identifyAndExtractData(file);
};

export const extractEngineTagData = async (file: File | Blob): Promise<EngineTagData> => {
    // This function can be merged into the more generic identifyAndExtractData
    return identifyAndExtractData(file);
};

export const sendMessage = async (text: string, history: any[], location?: { lat: number, lng: number }) => {
    const ai = getAiClient();
    const tools: any[] = [{ googleMaps: {} }, { googleSearch: {} }];
    const toolConfig: any = location ? {
        retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } }
    } : undefined;

    const response = await ai.models.generateContent({
        model: MODEL_NAMES.PRO,
        contents: [...history, { role: 'user', parts: [{ text }] }],
        config: { 
            systemInstruction: MILA_MUSK_SYSTEM_PROMPT,
            tools,
            toolConfig,
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });

    const groundingUrls = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => {
            if (chunk.web) return { uri: chunk.web.uri || '', title: chunk.web.title || '' };
            if (chunk.maps) return { uri: chunk.maps.uri || '', title: chunk.maps.title || '' };
            return null;
        })
        .filter(Boolean) as Array<{ uri: string, title: string }>;

    return { 
        text: response.text || '',
        groundingUrls: groundingUrls || []
    };
};

export const analyzeMedia = async (prompt: string, file: File) => {
    const ai = getAiClient();
    const b64 = await fileToBase64(file);
    const mimeType = file.type || 'image/jpeg';

    const response = await ai.models.generateContent({
        model: MODEL_NAMES.PRO,
        contents: {
            parts: [{ inlineData: { mimeType, data: b64 } }, { text: prompt }],
        }
    });
    return response.text;
};

export const transcribeAudio = async (file: File) => {
    const ai = getAiClient();
    const b64 = await fileToBase64(file);
    const mimeType = file.type || 'audio/webm';

    const response = await ai.models.generateContent({
        model: MODEL_NAMES.FLASH,
        contents: {
            parts: [{ inlineData: { mimeType, data: b64 } }, { text: "Transcribe this audio." }],
        },
    });
    return response.text;
};

export const generateImage = async (prompt: string, aspectRatio: string) => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: MODEL_NAMES.PRO_IMAGE,
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: "1K" } },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Image generation failed to produce an image.");
};

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16') => {
    const ai = getAiClient();
    let operation = await ai.models.generateVideos({
        model: MODEL_NAMES.VEO_FAST,
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed.");

    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
};

export const speakText = async (text: string, voiceName: 'Kore' | 'Puck' | 'Zephyr' = 'Kore') => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAMES.TTS,
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName } },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const decode = (base64: string) => {
                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                return bytes;
            };
            const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
                const dataInt16 = new Int16Array(data.buffer);
                const frameCount = dataInt16.length / numChannels;
                const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
                for (let channel = 0; channel < numChannels; channel++) {
                    const channelData = buffer.getChannelData(channel);
                    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
                }
                return buffer;
            };
            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start();
        }
    } catch (e) { console.error(e); }
};
