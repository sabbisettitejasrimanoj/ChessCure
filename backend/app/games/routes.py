import chess

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

def get_next_move_number(database, game_id):
    last_move = database.moves.find_one(
        {"game_id": game_id},
        sort=[("move_number", -1)],
    )

    if last_move is None:
        return 1

    return last_move["move_number"] + 1


def serialize_move(move):
    return {
        "id": str(move["_id"]),
        "game_id": str(move["game_id"]),
        "player_id": str(move["player_id"]),
        "actor": move.get("actor", "human"),
        "move_number": move["move_number"],
        "from_square": move["from_square"],
        "to_square": move["to_square"],
        "uci": move["uci"],
        "san": move["san"],
        "fen_before": move["fen_before"],
        "fen_after": move["fen_after"],
        "is_capture": move["is_capture"],
        "is_check": move["is_check"],
        "is_checkmate": move["is_checkmate"],
        "created_at": move["created_at"].isoformat(),
    }
    
@games_blueprint.post("/<game_id>/moves")
@jwt_required()
def make_player_move(game_id):
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

    data = request.get_json(silent=True) or {}

    from_square = str(
        data.get("from_square", "")
    ).strip().lower()

    to_square = str(
        data.get("to_square", "")
    ).strip().lower()

    promotion = str(
        data.get("promotion", "")
    ).strip().lower()

    if not from_square or not to_square:
        return jsonify(
            {
                "success": False,
                "message": "from_square and to_square are required.",
            }
        ), 400

    valid_promotion_pieces = ["", "q", "r", "b", "n"]

    if promotion not in valid_promotion_pieces:
        return jsonify(
            {
                "success": False,
                "message": (
                    "Promotion must be q, r, b or n."
                ),
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

    if game["status"] != "active":
        return jsonify(
            {
                "success": False,
                "message": "This game is not active.",
            }
        ), 409

    if game.get("current_turn") != "white":
        return jsonify(
            {
                "success": False,
                "message": "Wait for the AI opponent to move.",
            }
        ), 409

    try:
        board = chess.Board(game["current_fen"])
    except ValueError:
        return jsonify(
            {
                "success": False,
                "message": "The saved chess position is invalid.",
            }
        ), 500

    uci_move = f"{from_square}{to_square}{promotion}"

    try:
        move = chess.Move.from_uci(uci_move)
    except ValueError:
        return jsonify(
            {
                "success": False,
                "message": "Invalid chess-square format.",
            }
        ), 400

    if move not in board.legal_moves:
        return jsonify(
            {
                "success": False,
                "message": "Illegal chess move.",
                "submitted_move": uci_move,
                "legal_moves": [
                    legal_move.uci()
                    for legal_move in board.legal_moves
                ],
            }
        ), 400

    fen_before = board.fen()
    san_move = board.san(move)
    is_capture = board.is_capture(move)

    board.push(move)

    fen_after = board.fen()
    is_check = board.is_check()
    is_checkmate = board.is_checkmate()

    game_status = "active"
    game_result = "pending"
    completed_at = None

    if is_checkmate:
        game_status = "completed"
        game_result = "human_win"
        completed_at = datetime.now(timezone.utc)

    elif board.is_stalemate() or board.is_insufficient_material():
        game_status = "completed"
        game_result = "draw"
        completed_at = datetime.now(timezone.utc)

    move_document = {
        "game_id": game["_id"],
        "player_id": user_id,
        "actor": "human",
        "move_number": get_next_move_number(
            database,
            game["_id"],
        ),
        "from_square": from_square,
        "to_square": to_square,
        "uci": uci_move,
        "san": san_move,
        "fen_before": fen_before,
        "fen_after": fen_after,
        "is_capture": is_capture,
        "is_check": is_check,
        "is_checkmate": is_checkmate,
        "created_at": datetime.now(timezone.utc),
    }

    move_result = database.moves.insert_one(move_document)
    move_document["_id"] = move_result.inserted_id

    database.games.update_one(
        {"_id": game["_id"]},
        {
            "$set": {
                "current_fen": fen_after,
                "current_turn": (
                    "black"
                    if game_status == "active"
                    else "white"
                ),
                "status": game_status,
                "result": game_result,
                "completed_at": completed_at,
            }
        },
    )

    return jsonify(
        {
            "success": True,
            "message": "Player move accepted.",
            "move": serialize_move(move_document),
            "game": {
                "id": str(game["_id"]),
                "current_fen": fen_after,
                "current_turn": (
                    "black"
                    if game_status == "active"
                    else None
                ),
                "status": game_status,
                "result": game_result,
                "secret_chat_open": game.get(
                    "secret_chat_open",
                    False,
                ),
            },
        }
    ), 200    