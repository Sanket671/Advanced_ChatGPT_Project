"""
Comprehensive test suite for AI Preprocessing Engine.
Uses pytest for robust, production-grade testing.

Run with: pytest test_app.py -v
Or: pytest test_app.py -v --tb=short
"""

import pytest
import json
from app import (
    app,
    process_message,
    get_sentiment,
    detect_intent,
    extract_keywords,
    optimize_query,
    detect_toxicity,
)


# ============================================================================
# PYTEST FIXTURES
# ============================================================================

@pytest.fixture
def client():
    """Create a test client for Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def valid_message():
    """Standard test message."""
    return "I'm having trouble with my database connection code"


# ============================================================================
# UNIT TESTS: SENTIMENT ANALYSIS
# ============================================================================

class TestSentimentAnalysis:
    """Test sentiment analysis functionality."""

    def test_sentiment_positive(self):
        """Test positive sentiment detection."""
        result = get_sentiment("I love this! This is amazing and wonderful!")
        assert result['mapped'] in ['positive', 'neutral']  # Allows for model variance
        assert isinstance(result['score'], float)
        assert 0 <= result['score'] <= 1

    def test_sentiment_negative(self):
        """Test negative sentiment detection."""
        result = get_sentiment("This is terrible, awful, and horrible.")
        assert result['mapped'] in ['negative', 'neutral']  # Allows for model variance
        assert isinstance(result['score'], float)

    def test_sentiment_neutral(self):
        """Test neutral sentiment detection."""
        result = get_sentiment("The cat is on the table.")
        assert result['mapped'] in ['neutral']
        assert isinstance(result['score'], float)

    def test_sentiment_empty_string(self):
        """Test handling of empty strings."""
        result = get_sentiment("")
        assert result['mapped'] == 'neutral'
        assert result['score'] == 1.0

    def test_sentiment_whitespace_only(self):
        """Test handling of whitespace-only input."""
        result = get_sentiment("   ")
        assert result['mapped'] == 'neutral'


# ============================================================================
# UNIT TESTS: INTENT DETECTION
# ============================================================================

class TestIntentDetection:
    """Test intent classification functionality."""

    def test_intent_greeting(self):
        """Test greeting intent detection."""
        result = detect_intent("Hello! How are you doing today?")
        assert result['intent'] in ['greeting', 'general']
        assert isinstance(result['top_score'], float)
        assert 0 <= result['top_score'] <= 1

    def test_intent_technical(self):
        """Test technical question intent detection."""
        result = detect_intent("I'm getting an error when connecting to the database")
        assert result['intent'] in ['technical_question', 'general']
        assert isinstance(result['top_score'], float)

    def test_intent_emotional(self):
        """Test emotional support intent detection."""
        result = detect_intent("I'm feeling really stressed and overwhelmed right now")
        assert result['intent'] in ['emotional_support', 'general']
        assert isinstance(result['top_score'], float)

    def test_intent_general(self):
        """Test general inquiry intent detection."""
        result = detect_intent("What do you think about this topic?")
        assert result['intent'] in ['general', 'greeting']
        assert isinstance(result['top_score'], float)

    def test_intent_empty_string(self):
        """Test handling of empty strings."""
        result = detect_intent("")
        assert result['intent'] == 'general'
        assert result['top_score'] <= 0.5  # Low confidence expected


# ============================================================================
# UNIT TESTS: KEYWORD EXTRACTION
# ============================================================================

class TestKeywordExtraction:
    """Test keyword extraction functionality."""

    def test_keywords_extraction(self):
        """Test basic keyword extraction."""
        text = "I'm having trouble with my database connection code"
        result = extract_keywords(text)
        assert isinstance(result, list)
        assert len(result) <= 3
        assert all(isinstance(k, str) for k in result)
        # Should extract meaningful words
        assert any(word in result for word in ['database', 'connection', 'trouble'])

    def test_keywords_no_stopwords(self):
        """Test that stopwords are excluded."""
        text = "this is a test with the and or but"
        result = extract_keywords(text)
        stopwords = {'this', 'is', 'a', 'test', 'with', 'the', 'and', 'or', 'but'}
        # Result should not contain pure stopwords
        assert not result or not all(w in stopwords for w in result)

    def test_keywords_empty_string(self):
        """Test handling of empty strings."""
        result = extract_keywords("")
        assert result == []

    def test_keywords_short_words_filtered(self):
        """Test that very short words are filtered."""
        text = "is at ok my if go to"
        result = extract_keywords(text)
        # Words < 3 characters should be filtered
        assert all(len(word) >= 3 for word in result) or result == []

    def test_keywords_duplicates_counted(self):
        """Test that word frequency is considered."""
        text = "test test test code code"
        result = extract_keywords(text)
        # 'test' should rank higher than 'code'
        if result:
            assert result[0] == 'test' or 'test' in result


# ============================================================================
# UNIT TESTS: QUERY OPTIMIZATION
# ============================================================================

class TestQueryOptimization:
    """Test query optimization functionality."""

    def test_query_optimization_expansion(self):
        """Test that keywords are expanded."""
        text = "I have an error with my code"
        keywords = ['error', 'code']
        result = optimize_query(text, keywords)
        assert isinstance(result, str)
        assert len(result) > len(text)  # Should be expanded
        assert 'error' in result.lower()
        assert 'code' in result.lower()

    def test_query_optimization_no_keywords(self):
        """Test optimization with no keywords."""
        text = "Hello world"
        keywords = []
        result = optimize_query(text, keywords)
        assert result == text

    def test_query_optimization_empty_text(self):
        """Test handling of empty text."""
        result = optimize_query("", [])
        assert result == ""

    def test_query_optimization_max_length(self):
        """Test that output doesn't exceed max length."""
        text = "a" * 600  # Very long text
        keywords = ["test"]
        result = optimize_query(text, keywords)
        assert len(result) <= 500


# ============================================================================
# UNIT TESTS: TOXICITY DETECTION
# ============================================================================

class TestToxicityDetection:
    """Test toxicity detection functionality."""

    def test_toxicity_clean_message(self):
        """Test detection of clean messages."""
        result = detect_toxicity("This is a normal, clean message")
        assert isinstance(result['is_toxic'], bool)
        assert isinstance(result['score'], float)
        assert 0 <= result['score'] <= 1

    def test_toxicity_empty_string(self):
        """Test handling of empty strings."""
        result = detect_toxicity("")
        assert result['is_toxic'] == False
        assert result['score'] == 1.0

    def test_toxicity_response_structure(self):
        """Test response has required fields."""
        text = "Check this message for safety"
        result = detect_toxicity(text)
        assert 'is_toxic' in result
        assert 'score' in result
        assert 'label' in result


# ============================================================================
# UNIT TESTS: MAIN PIPELINE
# ============================================================================

class TestMainPipeline:
    """Test the main process_message pipeline."""

    def test_process_message_valid(self, valid_message):
        """Test processing a valid message."""
        result = process_message(valid_message)
        assert isinstance(result, dict)
        assert result['status'] == 'success'
        assert 'original' in result
        assert 'processed' in result
        assert 'sentiment' in result
        assert 'intent' in result
        assert 'keywords' in result
        assert 'optimized_query' in result
        assert 'is_toxic' in result

    def test_process_message_preserves_original(self):
        """Test that original message is preserved."""
        text = "Test Message"
        result = process_message(text)
        assert result['original'] == text

    def test_process_message_uppercase_processed(self):
        """Test that processed text is uppercase."""
        text = "hello world"
        result = process_message(text)
        assert result['processed'] == text.upper()

    def test_process_message_empty_raises_error(self):
        """Test that empty strings raise ValueError."""
        with pytest.raises(ValueError):
            process_message("")

    def test_process_message_whitespace_raises_error(self):
        """Test that whitespace-only strings raise ValueError."""
        with pytest.raises(ValueError):
            process_message("   ")

    def test_process_message_non_string_raises_error(self):
        """Test that non-string inputs raise ValueError."""
        with pytest.raises(ValueError):
            process_message(None)
        with pytest.raises(ValueError):
            process_message(123)
        with pytest.raises(ValueError):
            process_message([])

    def test_process_message_exceeds_max_length(self):
        """Test that overly long messages raise ValueError."""
        long_text = "a" * 10001
        with pytest.raises(ValueError):
            process_message(long_text)

    def test_process_message_response_types(self, valid_message):
        """Test that response fields have correct types."""
        result = process_message(valid_message)
        assert isinstance(result['original'], str)
        assert isinstance(result['processed'], str)
        assert isinstance(result['sentiment'], str)
        assert isinstance(result['sentiment_confidence'], float)
        assert isinstance(result['intent'], str)
        assert isinstance(result['intent_confidence'], float)
        assert isinstance(result['keywords'], list)
        assert isinstance(result['optimized_query'], str)
        assert isinstance(result['is_toxic'], bool)
        assert isinstance(result['toxicity_confidence'], float)


# ============================================================================
# INTEGRATION TESTS: FLASK API
# ============================================================================

class TestFlaskAPI:
    """Test Flask API endpoints."""

    def test_process_endpoint_valid_request(self, client):
        """Test /process endpoint with valid request."""
        response = client.post(
            "/process",
            data=json.dumps({"message": "Hello, how are you?"}),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'original' in data
        assert 'sentiment' in data
        assert 'intent' in data

    def test_process_endpoint_missing_message(self, client):
        """Test /process endpoint with missing message field."""
        response = client.post(
            "/process",
            data=json.dumps({}),
            content_type="application/json"
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_process_endpoint_empty_message(self, client):
        """Test /process endpoint with empty message."""
        response = client.post(
            "/process",
            data=json.dumps({"message": ""}),
            content_type="application/json"
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_process_endpoint_not_json(self, client):
        """Test /process endpoint with non-JSON content."""
        response = client.post(
            "/process",
            data="not json",
            content_type="text/plain"
        )
        assert response.status_code == 400

    def test_process_endpoint_malformed_json(self, client):
        """Test /process endpoint with malformed JSON."""
        response = client.post(
            "/process",
            data="{bad json}",
            content_type="application/json"
        )
        assert response.status_code == 400

    def test_health_endpoint(self, client):
        """Test /health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
        assert 'service' in data
        assert 'version' in data

    def test_404_endpoint(self, client):
        """Test 404 for non-existent endpoint."""
        response = client.get("/nonexistent")
        assert response.status_code == 404

    def test_method_not_allowed(self, client):
        """Test 405 for incorrect HTTP method."""
        response = client.get("/process")  # GET instead of POST
        assert response.status_code == 405


# ============================================================================
# INTEGRATION TESTS: END-TO-END SCENARIOS
# ============================================================================

class TestEndToEndScenarios:
    """Test realistic end-to-end scenarios."""

    def test_greeting_scenario(self, client):
        """Test complete greeting flow."""
        response = client.post(
            "/process",
            data=json.dumps({"message": "Hi! How's everything going?"}),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['intent'] in ['greeting', 'general']
        assert data['sentiment'] in ['positive', 'neutral']

    def test_technical_problem_scenario(self, client):
        """Test technical problem flow."""
        response = client.post(
            "/process",
            data=json.dumps({
                "message": "I'm getting a SQL syntax error when querying the API"
            }),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['intent'] in ['technical_question', 'general']
        assert data['sentiment'] in ['negative', 'neutral']

    def test_emotional_support_scenario(self, client):
        """Test emotional support flow."""
        response = client.post(
            "/process",
            data=json.dumps({
                "message": "I'm really stressed about the deadline"
            }),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'

    def test_multiple_requests_consistency(self, client):
        """Test that multiple requests to same message are consistent."""
        message = {"message": "Test message for consistency"}
        response1 = client.post(
            "/process",
            data=json.dumps(message),
            content_type="application/json"
        )
        response2 = client.post(
            "/process",
            data=json.dumps(message),
            content_type="application/json"
        )
        data1 = response1.get_json()
        data2 = response2.get_json()
        # Keys should match
        assert data1.keys() == data2.keys()


if __name__ == "__main__":
    # Run with: python -m pytest test_app.py -v
    pytest.main([__file__, "-v"])
