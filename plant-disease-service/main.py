"""
Plant Disease Detection — FastAPI Service
Modèle: plant_disease_prediction_model.h5
Architecture: CNN Sequential custom (Conv2D × 2 → Dense 256 → Softmax 38)
Prétraitement: PIL resize (224, 224) + astype float32 / 255.
               (identique à l'ImageDataGenerator rescale=1./255 du notebook)
Classes: chargées depuis class_indices.json (clés string "0"…"37")

Structure attendue:
  ./
  ├── main.py                              ← ce fichier
  ├── class_indices.json                   ← fourni avec votre projet
  └── trained_model/
      └── plant_disease_prediction_model.h5

Lancer:
  uvicorn main:app --host 0.0.0.0 --port 8001 --reload

v2.2.0 — Fix: mapping complet des 38 classes (plus de fallback Fongicide)
         Fix: motsCles généraux en français pour recherche DB flexible
"""

import os
import io
import json
import base64
import logging
from pathlib import Path

import numpy as np
from PIL import Image
import tensorflow as tf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Config logging ─────────────────────────────────────────────────────────────
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Chemins (mêmes conventions que votre main.py Streamlit original) ───────────
WORKING_DIR   = Path(__file__).parent
MODEL_PATH    = WORKING_DIR / "trained_model" / "plant_disease_prediction_model.h5"
CLASSES_PATH  = WORKING_DIR / "class_indices.json"

# ── Paramètres du modèle (extraits du notebook) ────────────────────────────────
IMG_SIZE      = 224          # img_size = 224 dans le notebook
CONFIDENCE_THRESHOLD = 65.0  # seuil en % pour déclarer une prédiction "fiable"

# ── Mapping maladie → catégorie produit AgriManager + mots-clés ───────────────
#
# RÈGLE:  clé   = partie droite exacte de "Plante___[clé]" dans class_indices.json
#         categorie = valeur EXACTE de la colonne Produit.Categorie dans votre DB
#         motsCles  = termes cherchés dans Nom / MatieresActives / Description
#
# Couverture: 100 % des 29 classes malades (0 fallback)
# ─────────────────────────────────────────────────────────────────────────────
DISEASE_TO_PRODUCT: dict[str, dict] = {

    # ── Pomme ──────────────────────────────────────────────────────────────────
    # idx 0 — Apple___Apple_scab
    "Apple_scab": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "cuivre", "mancozèbe", "soufre"],
    },
    # idx 1 — Apple___Black_rot
    "Black_rot": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "cuivre", "captan"],
    },
    # idx 2 — Apple___Cedar_apple_rust
    "Cedar_apple_rust": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "rouille", "triazole", "myclobutanil"],
    },

    # ── Cerise ─────────────────────────────────────────────────────────────────
    # idx 5 — Cherry_(including_sour)___Powdery_mildew
    "Powdery_mildew": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "soufre", "oïdium", "triazole"],
    },

    # ── Maïs ───────────────────────────────────────────────────────────────────
    # idx 7 — Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot
    "Cercospora_leaf_spot Gray_leaf_spot": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "chlorothalonil", "azoxystrobine", "cercospora"],
    },
    # idx 8 — Corn_(maize)___Common_rust_
    "Common_rust_": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "rouille", "triazole", "propiconazole"],
    },
    # idx 9 — Corn_(maize)___Northern_Leaf_Blight
    "Northern_Leaf_Blight": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "helminthosporiose", "azoxystrobine", "chlorothalonil"],
    },

    # ── Raisin ─────────────────────────────────────────────────────────────────
    # idx 11 — Grape___Black_rot
    # (partagé avec Apple___Black_rot — même clé, même traitement)

    # idx 12 — Grape___Esca_(Black_Measles)
    "Esca_(Black_Measles)": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "esca", "vigne", "cuivre"],
    },
    # idx 13 — Grape___Leaf_blight_(Isariopsis_Leaf_Spot)
    "Leaf_blight_(Isariopsis_Leaf_Spot)": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "mildiou", "cuivre", "mancozèbe"],
    },

    # ── Orange ─────────────────────────────────────────────────────────────────
    # idx 15 — Orange___Haunglongbing_(Citrus_greening)
    "Haunglongbing_(Citrus_greening)": {
        "categorie": "Insecticide",
        "motsCles":  ["insecticide", "psylle", "agrumes", "imidaclopride", "spirotetramat"],
    },

    # ── Pêche ──────────────────────────────────────────────────────────────────
    # idx 16 — Peach___Bacterial_spot
    "Bacterial_spot": {
        "categorie": "Bactericide",
        "motsCles":  ["bactericide", "cuivre", "bactériose", "hydroxyde de cuivre"],
    },

    # ── Pomme de terre ─────────────────────────────────────────────────────────
    # idx 20 — Potato___Early_blight
    "Early_blight": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "alternariose", "mancozèbe", "chlorothalonil"],
    },
    # idx 21 — Potato___Late_blight
    "Late_blight": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "mildiou", "cuivre", "métalaxyl", "mancozèbe"],
    },

    # ── Courge ─────────────────────────────────────────────────────────────────
    # idx 25 — Squash___Powdery_mildew
    # (même clé que Cherry Powdery_mildew → déjà défini)

    # ── Fraisier ───────────────────────────────────────────────────────────────
    # idx 26 — Strawberry___Leaf_scorch
    "Leaf_scorch": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "brûlure", "mycosphaerella", "captan"],
    },

    # ── Tomate ─────────────────────────────────────────────────────────────────
    # idx 28 — Tomato___Bacterial_spot  (même clé que Peach → déjà défini)

    # idx 29 — Tomato___Early_blight  (même clé que Potato → déjà défini)

    # idx 30 — Tomato___Late_blight  (même clé que Potato → déjà défini)

    # idx 31 — Tomato___Leaf_Mold
    "Leaf_Mold": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "cladosporiose", "chlorothalonil", "mancozèbe"],
    },
    # idx 32 — Tomato___Septoria_leaf_spot
    "Septoria_leaf_spot": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "septoriose", "chlorothalonil", "mancozèbe"],
    },
    # idx 33 — Tomato___Spider_mites Two-spotted_spider_mite
    "Spider_mites Two-spotted_spider_mite": {
        "categorie": "Acaricide",
        "motsCles":  ["acaricide", "acarien", "soufre", "abamectine", "bifenazate"],
    },
    # idx 34 — Tomato___Target_Spot
    "Target_Spot": {
        "categorie": "Fongicide",
        "motsCles":  ["fongicide", "corynespora", "azoxystrobine", "chlorothalonil"],
    },
    # idx 35 — Tomato___Tomato_Yellow_Leaf_Curl_Virus
    "Tomato_Yellow_Leaf_Curl_Virus": {
        "categorie": "Insecticide",
        "motsCles":  ["insecticide", "aleurode", "bemisia", "imidaclopride", "thiamethoxame"],
    },
    # idx 36 — Tomato___Tomato_mosaic_virus
    "Tomato_mosaic_virus": {
        "categorie": "Insecticide",
        "motsCles":  ["insecticide", "virus", "puceron", "vecteur", "huile minérale"],
    },
}

# ── App FastAPI ────────────────────────────────────────────────────────────────
app = FastAPI(title="AgriManager — Plant Disease Detection", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Chargement modèle + classes au démarrage ───────────────────────────────────
_model:         tf.keras.Model | None = None
_class_indices: dict[str, str]        = {}   # {"0": "Apple___Apple_scab", ...}


@app.on_event("startup")
async def startup():
    global _model, _class_indices

    # --- class_indices.json ---
    if not CLASSES_PATH.exists():
        logger.error(f"class_indices.json introuvable: {CLASSES_PATH}")
    else:
        _class_indices = json.loads(CLASSES_PATH.read_text(encoding="utf-8"))
        logger.info(f"Classes chargées: {len(_class_indices)} classes")

    # --- Modèle .h5 ---
    if not MODEL_PATH.exists():
        logger.error(
            f"Modèle introuvable: {MODEL_PATH}\n"
            "→ Placez plant_disease_prediction_model.h5 dans trained_model/"
        )
        return

    logger.info(f"Chargement du modèle depuis {MODEL_PATH} ...")
    _model = tf.keras.models.load_model(str(MODEL_PATH), compile=False)
    logger.info(
        f"Modèle prêt — input: {_model.input_shape}  "
        f"output: {_model.output_shape}  "
        f"classes JSON: {len(_class_indices)}"
    )


# ── Prétraitement — IDENTIQUE au notebook original ─────────────────────────────
def load_and_preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Reproduit exactement load_and_preprocess_image() du notebook:
      img = Image.open(image_path)
      img = img.resize((224, 224))
      img_array = np.array(img)
      img_array = np.expand_dims(img_array, axis=0)
      img_array = img_array.astype('float32') / 255.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")   # force RGB (pas de canal alpha)
    img = img.resize((IMG_SIZE, IMG_SIZE))                     # PIL BILINEAR par défaut
    img_array = np.array(img)                                  # (224, 224, 3)  uint8
    img_array = np.expand_dims(img_array, axis=0)              # (1, 224, 224, 3)
    img_array = img_array.astype("float32") / 255.             # [0, 1]
    return img_array


# ── Logique de prédiction ──────────────────────────────────────────────────────
def run_prediction(image_bytes: bytes) -> dict:
    tensor      = load_and_preprocess_image(image_bytes)
    probas      = _model.predict(tensor, verbose=0)[0]         # shape: (38,)
    top3_idx    = np.argsort(probas)[::-1][:3]

    results = []
    for idx in top3_idx:
        raw     = _class_indices.get(str(idx), f"Classe_{idx}")
        parts   = raw.split("___")
        plante  = parts[0].replace("_", " ").strip()
        maladie = parts[1].replace("_", " ").strip() if len(parts) > 1 else ""
        results.append({
            "classe":    raw,
            "plante":    plante,
            "maladie":   maladie,
            "confiance": round(float(probas[idx]) * 100, 2),
            "estSain":   "healthy" in raw.lower(),
        })

    best         = results[0]
    best_raw     = _class_indices.get(str(top3_idx[0]), "")
    disease_key  = best_raw.split("___")[-1] if "___" in best_raw else ""

    if best["estSain"]:
        recommendation = {
            "categorie": "Engrais",
            "motsCles":  ["engrais", "fertilisant", "preventif"],
        }
    else:
        # Chercher dans le mapping complet
        mapping = DISEASE_TO_PRODUCT.get(disease_key)

        if mapping is None:
            # Dernier recours : déduire la catégorie depuis le nom de la maladie
            dl = disease_key.lower()
            if any(k in dl for k in ["mite", "spider", "acari"]):
                cat, mots = "Acaricide", ["acaricide", "acarien", "soufre"]
            elif any(k in dl for k in ["bacteria", "bacterial", "spot"]):
                cat, mots = "Bactericide", ["bactericide", "cuivre", "bactériose"]
            elif any(k in dl for k in ["virus", "curl", "mosaic"]):
                cat, mots = "Insecticide", ["insecticide", "vecteur", "virus"]
            elif any(k in dl for k in ["haungl", "psyll", "whitefly"]):
                cat, mots = "Insecticide", ["insecticide", "psylle", "aleurode"]
            else:
                cat, mots = "Fongicide", ["fongicide", "traitement fongique"]
            mapping = {"categorie": cat, "motsCles": mots}
            logger.warning(f"Classe '{disease_key}' absente du mapping → fallback '{cat}'")

        recommendation = mapping

    return {
        "prediction":     best,
        "top3":           results,
        "recommendation": recommendation,
        "confiant":       best["confiance"] >= CONFIDENCE_THRESHOLD,
    }


# ── Schémas Pydantic ───────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    image_base64: str        # JPEG / PNG / WEBP encodé en base64
    filename:     str = "image.jpg"

class PredictionItem(BaseModel):
    classe:    str
    plante:    str
    maladie:   str
    confiance: float
    estSain:   bool

class PredictResponse(BaseModel):
    prediction:     PredictionItem
    top3:           list[PredictionItem]
    recommendation: dict
    confiant:       bool


# ── Endpoints ──────────────────────────────────────────────────────────────────
@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    if _model is None:
        raise HTTPException(503,
            "Modèle non chargé. Vérifiez que trained_model/plant_disease_prediction_model.h5 existe.")
    if not _class_indices:
        raise HTTPException(503,
            "class_indices.json non chargé.")

    # Décoder base64
    try:
        image_bytes = base64.b64decode(req.image_base64)
    except Exception:
        raise HTTPException(400, "image_base64 invalide — encodage base64 attendu.")

    # Vérifier intégrité de l'image
    try:
        img_check = Image.open(io.BytesIO(image_bytes))
        img_check.verify()
    except Exception:
        raise HTTPException(400, "Image corrompue ou format non supporté (JPEG / PNG / WEBP).")

    try:
        return run_prediction(image_bytes)
    except Exception as e:
        logger.exception("Erreur lors de la prédiction")
        raise HTTPException(500, f"Erreur interne: {str(e)}")


@app.get("/health")
async def health():
    return {
        "status":          "ok" if (_model is not None and _class_indices) else "degraded",
        "model_loaded":    _model is not None,
        "model_path":      str(MODEL_PATH),
        "model_exists":    MODEL_PATH.exists(),
        "classes_loaded":  len(_class_indices),
        "classes_path":    str(CLASSES_PATH),
        "img_size":        IMG_SIZE,
        "preprocess":      "PIL resize(224,224) + float32/255.",
        "tf_version":      tf.__version__,
    }


@app.get("/classes")
async def get_classes():
    return {
        "classes": _class_indices,
        "total":   len(_class_indices),
    }