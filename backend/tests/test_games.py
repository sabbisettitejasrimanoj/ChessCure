from bson import ObjectId

from app import create_app
from app.games import routes as game_routes


class InsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class Cursor(list):
    def sort(self, field, direction):
        list.sort(self, key=lambda document: document[field], reverse=direction < 0)
        return self


class Collection:
    def __init__(self):
        self.documents = []

    def insert_one(self, document):
        stored_document = dict(document)
        stored_document["_id"] = stored_document.get("_id", ObjectId())
        self.documents.append(stored_document)
        return InsertResult(stored_document["_id"])

    def find_one(self, query, sort=None):
        matching = [
            document
            for document in self.documents
            if all(document.get(key) == value for key, value in query.items())
        ]
        if sort and matching:
            field, direction = sort[0]
            matching.sort(
                key=lambda document: document[field],
                reverse=direction < 0,
            )
        return matching[0] if matching else None

    def find(self, query):
        return Cursor(
            [
                document
                for document in self.documents
                if all(document.get(key) == value for key, value in query.items())
            ]
        )

    def update_one(self, query, update):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                document.update(update.get("$set", {}))
                return


class Database:
    def __init__(self):
        self.games = Collection()
        self.moves = Collection()
        self.trigger_events = Collection()


def test_game_moves_are_persisted_and_undo_keeps_move_records(monkeypatch):
    database = Database()
    monkeypatch.setattr(game_routes, "get_database", lambda: database)
    client = create_app("testing").test_client()

    created = client.post("/api/games/ai", json={"difficulty": "Beginner"})
    assert created.status_code == 201
    game_id = created.get_json()["game"]["id"]

    illegal_move = client.post(
        f"/api/games/{game_id}/moves",
        json={"from_square": "e2", "to_square": "e5"},
    )
    assert illegal_move.status_code == 400
    assert database.moves.documents == []

    player_move = client.post(
        f"/api/games/{game_id}/moves",
        json={"from_square": "e2", "to_square": "e4"},
    )
    assert player_move.status_code == 200

    ai_move = client.post(f"/api/games/{game_id}/ai-move", json={})
    assert ai_move.status_code == 200

    history = client.get(f"/api/games/{game_id}/history").get_json()
    assert history["move_count"] == 2
    assert history["stored_move_count"] == 2
    assert [move["actor"] for move in history["moves"]] == ["human", "ai"]
    assert history["state_is_consistent"] is True

    undo = client.post(f"/api/games/{game_id}/undo").get_json()
    assert undo["move_count"] == 0
    assert undo["stored_move_count"] == 2
    assert all(move["undone"] is True for move in database.moves.documents)
