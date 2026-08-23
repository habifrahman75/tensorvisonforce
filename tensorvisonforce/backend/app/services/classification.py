"""
Classifies free-text complaint descriptions into one of the six
`ComplaintCategory` values.

Approach: TF-IDF vectorization + Multinomial Naive Bayes trained on
`ai/data/complaint_training.csv` (90 labeled examples). This is
intentionally simple/interpretable rather than a deep model -- with
~90 examples a heavier model would overfit, and NB gives calibrated-
enough class probabilities for a confidence score.

The trained pipeline is cached in-process (`lru_cache`) since the
training set is static; call `reload_classifier()` after editing the
CSV to force a retrain within the same process.
"""
from functools import lru_cache
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

from app.config import Settings
from app.schemas.ai import ClassificationResult
from app.schemas.complaints import ComplaintCategory


class ClassifierNotReadyError(RuntimeError):
    pass


def _load_training_data(csv_path: str) -> pd.DataFrame:
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"Training data not found at {csv_path}")
    df = pd.read_csv(path)
    required = {"text", "category"}
    if not required.issubset(df.columns):
        raise ValueError(f"Training CSV must contain columns {required}, got {set(df.columns)}")
    df = df.dropna(subset=["text", "category"])
    valid_categories = {c.value for c in ComplaintCategory}
    unknown = set(df["category"].unique()) - valid_categories
    if unknown:
        raise ValueError(f"Training CSV has unknown categories: {unknown}")
    return df


def _train_pipeline(df: pd.DataFrame) -> Pipeline:
    pipeline = Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    stop_words="english",
                    ngram_range=(1, 2),
                    min_df=1,
                ),
            ),
            ("clf", MultinomialNB(alpha=0.3)),
        ]
    )
    pipeline.fit(df["text"], df["category"])
    return pipeline


@lru_cache
def _get_pipeline(csv_path: str) -> Pipeline:
    df = _load_training_data(csv_path)
    return _train_pipeline(df)


def reload_classifier(csv_path: str) -> None:
    _get_pipeline.cache_clear()
    _get_pipeline(csv_path)


def classify_text(text: str, settings: Settings) -> ClassificationResult:
    if not text or not text.strip():
        raise ValueError("text must not be empty")

    pipeline = _get_pipeline(settings.classification_model_path)
    probabilities = pipeline.predict_proba([text])[0]
    classes = pipeline.classes_

    scores = {cls: round(float(prob), 4) for cls, prob in zip(classes, probabilities)}
    best_idx = probabilities.argmax()
    best_category = classes[best_idx]
    best_confidence = float(probabilities[best_idx])

    if best_confidence < settings.classification_confidence_threshold:
        best_category = ComplaintCategory.OTHER.value

    return ClassificationResult(
        category=ComplaintCategory(best_category),
        confidence=round(best_confidence, 4),
        scores=scores,
    )
