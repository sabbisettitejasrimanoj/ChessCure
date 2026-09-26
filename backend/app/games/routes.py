from datetime import datetime, timezone

from bson import ObjectId
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_database
from app.games import games_blueprint


STARTING_FEN = (
    "rnbqkbnr/pppppppp/8/8/8/8/"
    "PPPPPPPP/RNBQKBNR w KQkq - 0 1"
)

VALID_AI_LEVELS = ["easy", "medium", "hard"]


def serialize_game(game):
    return {
        "id": str(game["_id"]),
        "human_player_id": str(game["white_player_id"]),
        "opponent": {
            "type": "ai",
            "name": "ChessCure AI",
            "level": game.get("ai_level", "medium"),
            "color": "black",
        },
        "status": game["status"],
        "result": game.get("result", "pending"),
        "current_fen": game.get("current_fen", STARTING_FEN),
        "current_turn": game.get("current_turn", "white"),
        "secret_chat_open": game.get("secret_chat_open", False),
        "secret_chat_trigger": game.get("secret_chat_trigger"),
        "created_at": game["created_at"].isoformat(),
        "completed_at": (
            game["completed_at"].isoformat()
            if game.get("completed_at")
            else None
        ),
    }


def current_user_object_id():
    user_id = get_jwt_identity()

    if not ObjectId.is_valid(user_id):
        return None

    return ObjectId(user_id)


@games_blueprint.post("/ai")
@jwt_required()
def create_ai_game():
    user_id = current_user_object_id()

    if user_id is None:
        return jsonify(
            {
                "success": False,
                "message": "Invalid authentication token.",
            }
        ), 401

    data = request.get_json(silent=True) or {}
    ai_level = str(data.get("ai_level", "medium")).lower()

    if ai_level not in VALID_AI_LEVELS:
        return jsonify(
            {
                "success": False,
                "message": "AI level must be easy, medium or hard.",
            }
        ), 400

    database = get_database()

    user = database.users.find_one({"_id": user_id})

    if user is None:
        return jsonify(
            {
                "success": False,
                "message": "User not found.",
            }
        ), 404

    existing_game = database.games.find_one(
        {
            "white_player_id": user_id,
            "opponent_type": "ai",
            "status": "active",
        }
    )

    if existing_game:
        return jsonify(
            {
                "success": False,
                "message": "You already have an active AI game.",
                "game": serialize_game(existing_game),
            }
        ), 409

    game = {
    "white_player_id": user_id,
    "black_player_id": None,
    "opponent_type": "ai",
    "ai_level": ai_level,
    "status": "active",
    "result": "pending",
    "current_fen": STARTING_FEN,
    "current_turn": "white",
    "secret_chat_open": False,
    "secret_chat_trigger": None,
    "created_at": datetime.now(timezone.utc),
    "completed_at": None,
}

    result = database.games.insert_one(game)
    game["_id"] = result.inserted_id

    return jsonify(
        {
            "success": True,
            "message": "AI chess game started.",
            "game": serialize_game(game),
        }
    ), 201


@games_blueprint.get("/mine")
@jwt_required()
def my_ai_games():
    user_id = current_user_object_id()

    if user_id is None:
        return jsonify(
            {
                "success": False,
                "message": "Invalid authentication token.",
            }
        ), 401

    database = get_database()

    games = database.games.find(
        {
            "white_player_id": user_id,
            "opponent_type": "ai",
        }
    ).sort("created_at", -1)

    return jsonify(
        {
            "success": True,
            "games": [serialize_game(game) for game in games],
        }
    ), 200


@games_blueprint.get("/<game_id>")
@jwt_required()
def get_ai_game(game_id):
    user_id = current_user_object_id()

    if user_id is None:
        return jsonify(
            {
                "success": False,
                "message": "Invalid authentication token.",
            }
        ), 401

    if not ObjectId.is_valid(game_id):
        return jsonify(
            {
                "success": False,
                "message": "Invalid game ID.",
            }
        ), 400

    database = get_database()

    game = database.games.find_one(
        {
            "_id": ObjectId(game_id),
            "white_player_id": user_id,
            "opponent_type": "ai",
        }
    )

    if game is None:
        return jsonify(
            {
                "success": False,
                "message": "AI game not found.",
            }
        ), 404

    return jsonify(
        {
            "success": True,
            "game": serialize_game(game),
        }
    ), 200
    