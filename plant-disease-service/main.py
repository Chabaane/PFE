"""
Plant Disease Detection Microservice – FastAPI + modèle Keras (.h5)
Lancement : uvicorn main:app --host 0.0.0.0 --port 8001
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import io
import json
import os
import numpy as np
from PIL import Image
import tensorflow as tf
import logging
from tensorflow import keras

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Plant Disease Detection API - Custom Model", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

# ── Chargement des classes ──────────────────────────────────────────────────
WORKING_DIR = os.path.dirname(os.path.abspath(__file__))
class_indices_path = os.path.join(WORKING_DIR, "class_indices.json")
with open(class_indices_path, "r") as f:
    class_indices = json.load(f)   # dict { "0": "Apple___Apple_scab", ... }
CLASS_NAMES = [class_indices[str(i)] for i in range(len(class_indices))]
logger.info(f"Classes chargées : {len(CLASS_NAMES)}")

# ── Mapping maladie → catégorie et mots-clés ───────────────────────────────
# Adapté aux noms exacts du dataset PlantVillage
DISEASE_TO_CATEGORY = {
    "Apple___Apple_scab":                {"categorie": "Fongicide", "motsCles": ["scab", "fongicide", "cuivre"]},
    "Apple___Black_rot":                 {"categorie": "Fongicide", "motsCles": ["black rot", "fongicide"]},
    "Apple___Cedar_apple_rust":          {"categorie": "Fongicide", "motsCles": ["rouille", "fongicide"]},
    "Cherry_(including_sour)___Powdery_mildew": {"categorie": "Fongicide", "motsCles": ["oïdium", "soufre", "fongicide"]},
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": {"categorie": "Fongicide", "motsCles": ["cercosporiose", "fongicide"]},
    "Corn_(maize)___Common_rust_":       {"categorie": "Fongicide", "motsCles": ["rouille", "fongicide"]},
    "Corn_(maize)___Northern_Leaf_Blight": {"categorie": "Fongicide", "motsCles": ["helminthosporiose", "fongicide"]},
    "Grape___Black_rot":                 {"categorie": "Fongicide", "motsCles": ["black rot", "fongicide"]},
    "Grape___Esca_(Black_Measles)":      {"categorie": "Fongicide", "motsCles": ["esca", "fongicide"]},
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": {"categorie": "Fongicide", "motsCles": ["brûlure", "fongicide"]},
    "Orange___Haunglongbing_(Citrus_greening)": {"categorie": "Insecticide", "motsCles": ["psylle", "insecticide"]},
    "Peach___Bacterial_spot":            {"categorie": "Bactericide", "motsCles": ["bactériose", "cuivre", "bactericide"]},
    "Pepper,_bell___Bacterial_spot":     {"categorie": "Bactericide", "motsCles": ["bactériose", "cuivre", "bactericide"]},
    "Potato___Early_blight":             {"categorie": "Fongicide", "motsCles": ["alternariose", "fongicide"]},
    "Potato___Late_blight":              {"categorie": "Fongicide", "motsCles": ["mildiou", "fongicide", "cuivre"]},
    "Squash___Powdery_mildew":           {"categorie": "Fongicide", "motsCles": ["oïdium", "soufre", "fongicide"]},
    "Strawberry___Leaf_scorch":          {"categorie": "Fongicide", "motsCles": ["brûlure", "fongicide"]},
    "Tomato___Bacterial_spot":           {"categorie": "Bactericide", "motsCles": ["bactériose", "cuivre", "bactericide"]},
    "Tomato___Early_blight":             {"categorie": "Fongicide", "motsCles": ["alternariose", "fongicide"]},
    "Tomato___Late_blight":              {"categorie": "Fongicide", "motsCles": ["mildiou", "fongicide", "cuivre"]},
    "Tomato___Leaf_Mold":                {"categorie": "Fongicide", "motsCles": ["cladosporiose", "fongicide"]},
    "Tomato___Septoria_leaf_spot":       {"categorie": "Fongicide", "motsCles": ["septoriose", "fongicide"]},
    "Tomato___Spider_mites Two-spotted_spider_mite": {"categorie": "Acaricide", "motsCles": ["acarien", "acaricide", "soufre"]},
    "Tomato___Target_Spot":              {"categorie": "Fongicide", "motsCles": ["corynespora", "fongicide"]},
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {"categorie": "Insecticide", "motsCles": ["aleurode", "insecticide", "virus"]},
    "Tomato___Tomato_mosaic_virus":      {"categorie": "Insecticide", "motsCles": ["virus mosaïque", "désinfection"]},
}

# Pour les classes saines, pas de recommandation spéciale
for healthy_class in [k for k in CLASS_NAMES if "healthy" in k.lower()]:
    DISEASE_TO_CATEGORY[healthy_class] = {"categorie": "Engrais", "motsCles": []}

# ── Chargement du modèle ──────────────────────────────────────────────────
MODEL_PATH = os.path.join(WORKING_DIR, "plant_disease_prediction_model.h5")
_model = None

@app.on_event("startup")
async def startup_event():
    global _model
    logger.info("Chargement du modèle Keras...")
    _model = keras.models.load_model(MODEL_PATH)
    logger.info("Modèle chargé avec succès.")

def preprocess_image(image_bytes: bytes, target_size=(224, 224)) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(target_size)
    img_array = keras.utils.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = img_array.astype("float32") / 255.0
    return img_array

def predict(image_bytes: bytes) -> dict:
    img_array = preprocess_image(image_bytes)
    predictions = _model.predict(img_array, verbose=0)[0]
    top_indices = np.argsort(predictions)[::-1][:3]

    top3 = []
    for idx in top_indices:
        score = float(predictions[idx]) * 100
        class_name = CLASS_NAMES[idx]
        # Extraire plante et maladie
        parts = class_name.split("___")
        plante = parts[0].replace("_", " ")
        maladie = parts[1].replace("_", " ") if len(parts) > 1 else ""
        estSain = "healthy" in class_name.lower()
        top3.append({
            "classe": class_name,
            "plante": plante,
            "maladie": maladie,
            "confiance": round(score, 2),
            "estSain": estSain,
        })

    top = top3[0]
    recommandation = DISEASE_TO_CATEGORY.get(top["classe"], {"categorie": "Engrais", "motsCles": []})
    return {
        "prediction": top,
        "top3": top3,
        "recommendation": recommandation,
        "confiant": top["confiance"] >= 70.0,
    }

# ── Schémas ──────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    image_base64: str
    filename: str = "image.jpg"

class PredictResponse(BaseModel):
    prediction: dict
    top3: list[dict]
    recommendation: dict
    confiant: bool

# ── Endpoints ─────────────────────────────────────────────────────────────
@app.post("/predict", response_model=PredictResponse)
async def predict_endpoint(req: PredictRequest):
    if _model is None:
        raise HTTPException(503, "Modèle non initialisé")
    try:
        image_bytes = base64.b64decode(req.image_base64)
    except Exception:
        raise HTTPException(400, "Image base64 invalide")
    try:
        result = predict(image_bytes)
        return result
    except Exception as e:
        logger.error(f"Erreur de prédiction : {e}")
        raise HTTPException(500, f"Erreur de prédiction: {str(e)}")

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": _model is not None, "classes": len(CLASS_NAMES)}