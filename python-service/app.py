"""
AI Preprocessing Engine - Flask Microservice
===========================================
Production-ready NLP preprocessing pipeline with ML-based models.

Features:
- Sentiment Analysis (transformer-based: positive/negative/neutral)
- Intent Detection (zero-shot classification for generalization)
- Keyword Extraction (TF-IDF based with stopword filtering)
- Query Optimization (semantic search enhancement)
- Toxicity Detection (transformer-based content filtering)

Architecture:
- Models cached in memory for performance
- Input validation with pydantic
- Comprehensive error handling and logging
- Production-ready Flask application
"""

from flask import Flask, request, jsonify
from pydantic import BaseModel, ValidationError, validator
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from sklearn.feature_extraction.text import TfidfVectorizer
from pydantic import field_validator
from werkzeug.exceptions import BadRequest
from transformers import pipeline
import logging
import os
import re
from typing import Dict, List, Optional
from functools import lru_cache
import threading

# ============================================================================
# CONFIGURATION & SETUP
# ============================================================================

# Configure logging with more detail
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Model cache lock for thread-safe loading
_model_lock = threading.Lock()
_models_cache = {}

# ============================================================================
# CONFIGURATION CONSTANTS
# ============================================================================

# Common English stopwords for keyword extraction
# STOPWORDS = {
#     'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
#     'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
#     'the', 'to', 'was', 'will', 'with', 'i', 'me', 'my', 'we', 'you',
#     'your', 'this', 'what', 'when', 'where', 'who', 'which', 'why',
#     'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
#     'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'same',
#     'so', 'than', 'too', 'very', 'can', 'just', 'should', 'now',
#     'if', 'while', 'about', 'through', 'during', 'before', 'after',
#     'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
#     'again', 'further', 'then', 'once', 'could', 'would', 'should',
#     'do', 'does', 'did', 'have', 'has', 'had', 'having', 'been',
#     'being', 'am', 'are', 'were', 'be', 'been', 'being', 'but', 
#     'because', 'however', 'also', 'yet'
# }

STOPWORDS = set(ENGLISH_STOP_WORDS)

# Intent candidate labels for zero-shot classification
INTENT_CANDIDATES = [
    'greeting or salutation',
    'technical question or problem',
    'request for emotional support',
    'general inquiry or conversation'
]

# Query expansion terms for semantic search enhancement
QUERY_EXPANSIONS = {
    'error': ['error', 'exception', 'bug', 'fault', 'failure', 'problem'],
    'question': ['question', 'inquiry', 'ask', 'how', 'what', 'why'],
    'help': ['help', 'support', 'assistance', 'guidance', 'aid'],
    'code': ['code', 'programming', 'script', 'development', 'implementation'],
    'database': ['database', 'db', 'data', 'storage', 'persistence'],
    'api': ['api', 'endpoint', 'rest', 'service', 'request'],
    'ui': ['ui', 'interface', 'frontend', 'design', 'visual'],
    'performance': ['performance', 'speed', 'optimization', 'efficiency', 'latency']
}

# ============================================================================
# VALIDATION MODELS WITH PYDANTIC
# ============================================================================

class ProcessRequest(BaseModel):
    """Validation model for process endpoint requests."""
    message: str

    @field_validator('message')
    def message_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Message cannot be empty or whitespace only')
        if len(v) > 10000:
            raise ValueError('Message exceeds maximum length of 10000 characters')
        return v.strip()

class ProcessResponse(BaseModel):
    """Validation model for process endpoint responses."""
    original: str
    processed: str
    sentiment: str
    intent: str
    keywords: List[str]
    optimized_query: str
    is_toxic: bool
    status: str
    confidence: Dict[str, float]

# ============================================================================
# MODEL LOADING & CACHING
# ============================================================================

def _get_sentiment_pipeline():
    """Load sentiment analysis model with caching."""
    if 'sentiment' not in _models_cache:
        with _model_lock:
            if 'sentiment' not in _models_cache:
                logger.info("Loading sentiment analysis model...")
                _models_cache['sentiment'] = pipeline(
                    'sentiment-analysis',
                    model='cardiffnlp/twitter-roberta-base-sentiment',
                    device=-1  # CPU mode; use device=0 for GPU
                )
    return _models_cache['sentiment']

def _get_intent_classifier():
    """Load zero-shot intent classifier with caching."""
    if 'intent' not in _models_cache:
        with _model_lock:
            if 'intent' not in _models_cache:
                logger.info("Loading zero-shot intent classifier...")
                _models_cache['intent'] = pipeline(
                    'zero-shot-classification',
                    model='facebook/bart-large-mnli',
                    device=-1  # CPU mode
                )
    return _models_cache['intent']

def _get_toxicity_pipeline():
    """Load toxicity detection model with caching."""
    if 'toxicity' not in _models_cache:
        with _model_lock:
            if 'toxicity' not in _models_cache:
                logger.info("Loading toxicity detection model...")
                _models_cache['toxicity'] = pipeline(
                    'text-classification',
                    model='unitary/toxic-bert',
                    device=-1  # CPU mode
                )
    return _models_cache['toxicity']

# ============================================================================
# MODULAR PROCESSING FUNCTIONS
# ============================================================================

def get_sentiment(text: str) -> Dict[str, any]:
    """
    Analyze sentiment using transformer-based model.
    
    Args:
        text (str): Input text to analyze
        
    Returns:
        Dict: 'label' (positive/negative), 'score' (confidence 0-1), 'mapped' (positive/negative/neutral)
    """
    try:
        if not text or not text.strip():
            return {'label': 'NEUTRAL', 'score': 1.0, 'mapped': 'neutral'}
        
        sentiment_pipeline = _get_sentiment_pipeline()
        result = sentiment_pipeline(text[:512])[0]

        label = result['label'].lower()
        score = result['score']

        # Mapping for 3-class sentiment model
        mapping = {
            'label_0': 'negative',
            'label_1': 'neutral',
            'label_2': 'positive'
        }

        mapped = mapping.get(label, 'neutral')
        
        logger.info(f"Sentiment: {mapped} (confidence: {score:.3f})")
        return {
            'label': result['label'],
            'score': round(score, 3),
            'mapped': mapped
        }
    except Exception as e:
        logger.warning(f"Sentiment analysis error: {str(e)}")
        return {'label': 'NEUTRAL', 'score': 1.0, 'mapped': 'neutral'}


def detect_intent(text: str) -> Dict[str, any]:
    """
    Detect user intent using zero-shot classification (generalizable).
    
    Args:
        text (str): Input text to analyze
        
    Returns:
        Dict: 'intent' (best match), 'scores' (all candidates with scores), 'top_score' (confidence)
    """
    try:
        if not text or not text.strip():
            return {
                'intent': 'general',
                'scores': {label: 0.25 for label in INTENT_CANDIDATES},
                'top_score': 0.25
            }
        
        intent_classifier = _get_intent_classifier()
        result = intent_classifier(text[:512], INTENT_CANDIDATES)
        
        intent = result['labels'][0]
        top_score = round(result['scores'][0], 3)
        
        # Create scores dict
        scores = {label: round(score, 3) for label, score in zip(result['labels'], result['scores'])}
        
        # Map to short form for response
        intent_mapping = {
            'greeting or salutation': 'greeting',
            'technical question or problem': 'technical_question',
            'request for emotional support': 'emotional_support',
            'general inquiry or conversation': 'general'
        }
        
        mapped_intent = intent_mapping.get(intent, 'general')
        
        logger.info(f"Intent: {mapped_intent} (confidence: {top_score:.3f})")
        return {
            'intent': mapped_intent,
            'scores': scores,
            'top_score': top_score
        }
    except Exception as e:
        logger.warning(f"Intent detection error: {str(e)}")
        return {
            'intent': 'general',
            'scores': {label: 0.25 for label in INTENT_CANDIDATES},
            'top_score': 0.25
        }


def extract_keywords(text: str, top_n: int = 3) -> List[str]:
    try:
        if not text or not text.strip():
            return []

        vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=top_n
        )

        tfidf_matrix = vectorizer.fit_transform([text])
        features = vectorizer.get_feature_names_out()

        # 🔥 Post-filtering (IMPORTANT)
        keywords = [
            word for word in features
            if len(word) >= 3  # remove short words like 'ok'
        ]

        # 🔥 Extra safety: if all words are weak → return []
        if len(keywords) <= 1:
            return []

        return keywords

    except Exception as e:
        logger.warning(f"Keyword extraction error: {str(e)}")
        return []


def optimize_query(text: str, keywords: List[str]) -> str:
    """
    Generate optimized query for semantic search.
    Expands keywords with contextual synonyms.
    
    Args:
        text (str): Original text
        keywords (List[str]): Extracted keywords
        
    Returns:
        str: Optimized query for vector search
    """
    try:
        if not text or not text.strip():
            return ""
        
        # Start with normalized original
        optimized = text.strip()
        
        # For each keyword, add expansion if available
        for keyword in keywords:
            for key, expansions in QUERY_EXPANSIONS.items():
                if keyword.lower() in expansions:
                    # Add all expanded terms
                    expansion_str = ' '.join(exp for exp in expansions if exp != keyword.lower())
                    optimized += f" {expansion_str}"
                    break
        
        # Clean up and limit
        optimized = ' '.join(optimized.split())[:500]
        
        logger.info(f"Query optimized: {optimized[:60]}...")
        return optimized
    except Exception as e:
        logger.warning(f"Query optimization error: {str(e)}")
        return text.strip()[:500]


def detect_toxicity(text: str) -> Dict[str, any]:
    """
    Detect toxic/abusive content using transformer model.
    
    Args:
        text (str): Input text to analyze
        
    Returns:
        Dict: 'is_toxic' (bool), 'score' (confidence), 'label' (predicted class)
    """
    try:
        if not text or not text.strip():
            return {'is_toxic': False, 'score': 1.0, 'label': 'Safe'}
        
        toxicity_pipeline = _get_toxicity_pipeline()
        result = toxicity_pipeline(text[:512])[0]
        
        # Classify as toxic if label is not "safe" (depends on model)
        label = result['label']
        score = round(result['score'], 3)
        label = result['label'].lower()
        score = result['score']

        # toxic-bert labels: toxic / non-toxic
        is_toxic = label == 'toxic' and score > 0.85
        
        if is_toxic:
            logger.warning(f"Toxic content detected (confidence: {score})")
        
        return {
            'is_toxic': is_toxic,
            'score': score,
            'label': label
        }
    except Exception as e:
        logger.warning(f"Toxicity detection error: {str(e)}")
        # Default to safe if model fails
        return {'is_toxic': False, 'score': 1.0, 'label': 'Safe'}




# ============================================================================
# MAIN PROCESSING PIPELINE
# ============================================================================

def process_message(text: str) -> Dict:
    """
    Main preprocessing pipeline.
    Processes a message through all NLP stages and returns enriched data.
    
    Args:
        text (str): Raw user message
        
    Returns:
        Dict: Processed message with all metadata and confidence scores
        
    Raises:
        ValueError: If input is invalid
    """
    # Validate input
    if not text or not isinstance(text, str):
        raise ValueError("Message must be a non-empty string")
    
    text = text.strip()
    if not text:
        raise ValueError("Message cannot be empty")
    
    if len(text) > 10000:
        raise ValueError("Message exceeds maximum length of 10000 characters")
    
    logger.info(f"Processing message: {text[:60]}...")
    
    # Process through all stages
    processed_text = text.upper()
    sentiment_result = get_sentiment(text)
    intent_result = detect_intent(text)
    keywords = extract_keywords(text)
    optimized_query = optimize_query(text, keywords)
    toxicity_result = detect_toxicity(text)
    
    result = {
        "original": text,
        "processed": processed_text,
        "sentiment": sentiment_result['mapped'],
        "intent": intent_result['intent'],
        "keywords": keywords,
        "optimized_query": optimized_query,
        "is_toxic": toxicity_result['is_toxic'],
        "status": "success",
        "confidence": {
            "sentiment": sentiment_result['score'],
            "intent": intent_result['top_score'],
            "toxicity": toxicity_result['score']
        }
    }    

    logger.info(
        f"Message processed. Sentiment: {sentiment_result['mapped']}, "
        f"Intent: {intent_result['intent']}, Toxic: {toxicity_result['is_toxic']}"
    )
    return result



# ============================================================================
# FLASK ROUTES
# ============================================================================

@app.route("/process", methods=["POST"])
def process_route():
    """
    Flask route to process messages through NLP pipeline.
    
    Expected JSON input:
    {
        "message": "Your message here"
    }
    
    Returns enriched message with sentiment, intent, keywords, and toxicity.
    """
    try:
        # Validate request content type
        if not request.is_json:
            logger.warning("Request is not JSON")
            return jsonify({
                "error": "Request must be JSON",
                "status": "error"
            }), 400
        
        # Parse and validate request
        try:
            try:
                payload = request.get_json()
            except BadRequest:
                logger.warning("Malformed JSON")
                return jsonify({
                    "error": "Malformed JSON payload",
                    "status": "error"
                }), 400

            if payload is None:
                logger.warning("Received None payload")
                return jsonify({
                    "error": "Malformed JSON payload",
                    "status": "error"
                }), 400
            
            # Validate with pydantic
            request_data = ProcessRequest(**payload)
        except ValidationError as e:
            logger.warning(f"Validation error: {e}")
            return jsonify({
                "error": f"Validation error: {str(e)}",
                "status": "error"
            }), 400
        
        # Process message
        result = process_message(request_data.message)
        
        # Validate response
        response_data = ProcessResponse(**result)
        
        return jsonify(response_data.model_dump()), 200
    
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 400
    
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "details": str(e) if app.debug else "An error occurred",
            "status": "error"
        }), 500


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for monitoring service availability."""
    return jsonify({
        "status": "healthy",
        "service": "AI Preprocessing Engine",
        "version": "3.0",
        "models": list(_models_cache.keys())
    }), 200


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({
        "error": "Endpoint not found",
        "status": "error"
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors (method not allowed)."""
    return jsonify({
        "error": "Method not allowed",
        "status": "error"
    }), 405


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    logger.info("=" * 70)
    logger.info("AI PREPROCESSING ENGINE - Starting Flask server")
    logger.info("=" * 70)
    logger.info("🚀 Server running on http://0.0.0.0:5000")
    logger.info("📝 API Endpoint: POST /process")
    logger.info("💓 Health Check: GET /health")
    logger.info("=" * 70)
    
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=os.getenv('FLASK_ENV') == 'development',
        use_reloader=False  # Disable reloader to avoid loading models twice
    )

