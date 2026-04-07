from flask import Flask, request, jsonify

app = Flask(__name__)


def process_input(data):
    """Process incoming JSON data and return a response payload."""
    if not isinstance(data, dict):
        return {
            "error": "Invalid input format, expected JSON object.",
            "input": data,
        }

    processed = {
        "original": data,
        "processed": {},
        "message": "Request processed successfully.",
    }

    for key, value in data.items():
        if isinstance(value, str):
            processed_value = value.strip().upper()
        elif isinstance(value, bool):
            processed_value = not value
        elif isinstance(value, (int, float)):
            processed_value = value * 2
        else:
            processed_value = value

        processed["processed"][key] = processed_value

    return processed


@app.route("/process", methods=["POST"])
def process_route():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON."}), 400

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Malformed JSON payload."}), 400

    result = process_input(payload)
    status = 200 if "error" not in result else 400
    return jsonify(result), status


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

