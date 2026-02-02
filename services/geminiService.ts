
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
              text: `Tu es l'expert tactique ultime pour le jeu "Mines" de 1win. Ta mission est d'analyser cette capture d'écran de grille ${gridSize}x${gridSize} pour prédire les prochaines cases sûres.

OBJECTIFS D'ANALYSE :
1. RECONNAISSANCE VISUELLE : Identifie précisément l'emplacement des diamants (💎) déjà trouvés et des mines (💣) révélées.
2. DÉTECTION DE PATTERNS 1WIN : Analyse la distribution spatiale. L'algorithme 1win utilise souvent des schémas de "clusters" (mines regroupées) ou des "diagonales de sécurité". Identifie les zones de vide thermique où la densité de mines semble statistiquement plus faible.
3. CALCUL DE RISQUE : Évalue la proximité des cases non-révélées par rapport aux mines connues. Évite les cases adjacentes aux mines révélées ("Heat Map Analysis").
4. SÉLECTION TACTIQUE : Sélectionne entre 3 et 5 cases non-révélées présentant le meilleur ratio de sécurité.

FORMAT DE RÉPONSE ATTENDU (JSON) :
- "analysisText" : Un résumé stratégique en français, mentionnant explicitement le pattern détecté (ex: "Dispersion périphérique", "Cluster central identifié", "Ligne de sécurité diagonale").
- "predictions" : Un tableau d'objets { r, c, p, reason } où 'r' est la ligne (0 à ${gridSize-1}), 'c' la colonne (0 à ${gridSize-1}), 'p' l'indice de confiance (75-99) et 'reason' une brève explication tactique (ex: "Zone de vide détectée", "Pattern de dispersion éloigné", "Secteur de faible densité").

Les indices r et c commencent impérativement à 0. Ne renvoie rien d'autre que le JSON.`,
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
        analysisText: result.analysisText || "Analyse tactique terminée. Aucune anomalie majeure détectée.",
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
