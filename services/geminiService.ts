
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export class GeminiService {
  private static instance: GeminiService;

  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  async analyzeScreenshot(base64Image: string, gridSize: number): Promise<AnalysisResult> {
    // CRITICAL: Create a new instance right before making the call to use the latest API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image.split(',')[1] || base64Image,
              },
            },
            {
              text: `Tu es un système de prédiction haute précision pour le jeu "Mines" de 1win (grille ${gridSize}x${gridSize}).
              
              ANALYSE :
              1. Identifie les cases révélées (Diamants) et les mines visibles.
              2. Détermine les zones à forte probabilité de succès (Safe Cells) en te basant sur la distribution visuelle habituelle de l'algorithme 1win.
              3. Retourne exactement 3 à 5 coordonnées de cases non-révélées que tu considères comme les plus sûres.
              
              FORMAT DE RÉPONSE : JSON uniquement. Les indices r (ligne) et c (colonne) commencent à 0.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysisText: {
                type: Type.STRING,
                description: "Résumé tactique global des patterns détectés.",
              },
              predictions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    r: { type: Type.INTEGER, description: "Index de la ligne (0 à gridSize-1)" },
                    c: { type: Type.INTEGER, description: "Index de la colonne (0 à gridSize-1)" },
                    p: { type: Type.NUMBER, description: "Indice de confiance de 0 à 100" },
                    reason: { type: Type.STRING, description: "Brève raison tactique" }
                  },
                  required: ["r", "c", "p", "reason"]
                }
              }
            },
            required: ["analysisText", "predictions"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      return {
        analysisText: result.analysisText || "Analyse terminée.",
        predictions: result.predictions || []
      };
    } catch (error: any) {
      console.error("Gemini Tactical Analysis Error:", error);
      // Propagate specific error for key selection if needed
      if (error?.message?.includes("Requested entity was not found")) {
        throw new Error("KEY_NOT_FOUND");
      }
      throw error;
    }
  }
}
