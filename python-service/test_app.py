import unittest

from app import app


class ProcessEndpointTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def test_process_valid_json(self):
        response = self.client.post(
            "/process",
            json={"name": "alice", "value": 10, "active": False},
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("original", data)
        self.assertIn("processed", data)
        self.assertEqual(data["original"]["name"], "alice")
        self.assertEqual(data["processed"]["name"], "ALICE")
        self.assertEqual(data["processed"]["value"], 20)
        self.assertEqual(data["processed"]["active"], True)

    def test_process_missing_json(self):
        response = self.client.post("/process", data="not json", content_type="text/plain")
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertEqual(data["error"], "Request must be JSON.")

    def test_process_malformed_json(self):
        response = self.client.post(
            "/process",
            data="{bad json}",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertEqual(data["error"], "Malformed JSON payload.")


if __name__ == "__main__":
    unittest.main()
