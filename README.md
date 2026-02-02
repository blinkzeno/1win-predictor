# 1Win Mines Predictor AI - Pro Vision V3.0

Une application de simulation et de prédiction tactique pour le jeu "Mines" (1win), intégrant une analyse vision par intelligence artificielle (Google Gemini).

> **Note Technique :** Ce document sert de spécification de référence pour le portage de l'application vers la technologie **Flutter**.

## 🚀 Fonctionnalités Clés

### 1. Simulation de Jeu Avancée
- **Grilles Dynamiques :** Support des formats 3x3, 5x5 et 7x7 avec ajustement automatique de l'interface.
- **Paramétrage des Mines :** Curseur dynamique permettant de définir de 1 à (N-1) mines.
- **Logique Probabiliste :** Calcul en temps réel de l'indice de sécurité bayésien lors de chaque clic.

### 2. IA Vision Engine (Gemini 3 Flash)
- **Analyse de Capture d'Écran :** Système d'upload de screenshot permettant à l'IA d'analyser les patterns des parties précédentes.
- **Prédictions Visuelles :** L'IA ne se contente pas de texte ; elle marque directement la grille avec des overlays (points d'interrogation bleus animés) et des pourcentages de confiance.
- **Rapport Tactique :** Génération d'un log textuel expliquant la stratégie (ex: "Pattern en diagonale détecté").

### 3. Interface & Design (Cyber-Aesthetic)
- **Thème "Deep Navy" :** Palette de couleurs sombre (#0a0f1e) avec accents bleu néon et émeraude.
- **Glassmorphism :** Utilisation intensive de flous d'arrière-plan (backdrop-blur) et de bordures semi-transparentes.
- **Animations Fluides :** Effets de scan, pulsations sur les zones recommandées et transitions de victoire/défaite "Zoom-in".

### 4. Paramètres & Sécurité
- **Gestion d'API Key :** Interface intégrée pour sélectionner ou changer la clé API Google Cloud.
- **Mode Développeur (Triche) :** Toggle permettant de révéler l'emplacement réel des mines pour l'entraînement.

---

## 🛠 Spécifications pour le Portage Flutter (Prompt de Développement)

Pour recréer cette application à l'identique sous Flutter, utilisez le prompt suivant :

> **PROMPT DE RÉPLICATION FLUTTER :**
> "Agis en tant que développeur Flutter Senior. Crée une application '1Win Mines Predictor' avec un design Cyber-Tech. 
> **Structure UI :** Utilise un `Scaffold` avec un fond sombre dégradé. La grille doit être un `SliverGrid` ou un `GridView.builder` dynamique (3x3 à 7x7). Chaque cellule est un `Container` stylisé avec des bordures `Glassmorphism`.
> **Logique IA :** Intègre le package `google_generative_ai`. Crée un service qui accepte une image (File) et retourne un objet JSON structuré contenant : 
> 1. Un texte d'analyse.
> 2. Une liste de coordonnées (r, c) avec un score de probabilité.
> **Comportement Visuel :** 
> - Si une cellule est prédite par l'IA, affiche un `AnimatedContainer` avec une bordure bleue pulsante et le texte '%'.
> - Utilise `CustomPainter` pour les effets de lueur (Glow) en arrière-plan.
> - Gestion d'état : Utilise `Provider` ou `Riverpod` pour synchroniser la grille, les logs de l'historique et les paramètres d'API.
> - Intègre une boîte de dialogue pour la saisie de la clé API via `SharedPreferences` pour la persistance."

## 📈 Algorithme de Prédiction
L'application utilise une combinaison de :
1. **Probabilité Combinatoire :** `(Cases Sûres Restantes / Cases Totales Restantes) * 100`.
2. **Inférence Vision :** Analyse de la densité des mines par Gemini pour détecter les zones de "cluster" ou de "dispersion" propres à l'algorithme 1win.

---
*Développé pour l'optimisation stratégique et l'analyse de données IA.*