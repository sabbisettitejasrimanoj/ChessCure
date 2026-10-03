import chess
from app.services.ai_engine import choose_ai_move
from app.services.move_analyzer import analyze_human_move

from datetime import datetime, timezone

from bson import ObjectId
from flask import jsonify, request

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


@games_blueprint.post("/ai")
def create_ai_game():
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
    player_id = ObjectId()

    game = {
        "white_player_id": player_id,
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


@games_blueprint.get("/<game_id>")
def get_ai_game(game_id):
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
    
@games_blueprint.post("/<game_id>/ai-move")
@jwt_required()
def make_ai_move(game_id):
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

    if game["status"] != "active":
        return jsonify(
            {
                "success": False,
                "message": "This game is not active.",
            }
        ), 409

    if game.get("current_turn") != "black":
        return jsonify(
            {
                "success": False,
                "message": "It is not the AI opponent's turn.",
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

    if board.turn != chess.BLACK:
        return jsonify(
            {
                "success": False,
                "message": "The board position is not on the AI turn.",
            }
        ), 409

    ai_level = game.get("ai_level", "medium")
    ai_move = choose_ai_move(board, ai_level)

    if ai_move is None:
        return jsonify(
            {
                "success": False,
                "message": "No legal AI moves are available.",
            }
        ), 409

    fen_before = board.fen()
    san_move = board.san(ai_move)
    is_capture = board.is_capture(ai_move)

    board.push(ai_move)

    fen_after = board.fen()
    is_check = board.is_check()
    is_checkmate = board.is_checkmate()

    game_status = "active"
    game_result = "pending"
    completed_at = None
    next_turn = "white"

    if is_checkmate:
        game_status = "completed"
        game_result = "ai_win"
        completed_at = datetime.now(timezone.utc)
        next_turn = None

    elif board.is_game_over():
        game_status = "completed"
        game_result = "draw"
        completed_at = datetime.now(timezone.utc)
        next_turn = None

    move_document = {
        "game_id": game["_id"],
        "player_id": None,
        "actor": "ai",
        "move_number": get_next_move_number(
            database,
            game["_id"],
        ),
        "from_square": chess.square_name(
            ai_move.from_square
        ),
        "to_square": chess.square_name(
            ai_move.to_square
        ),
        "uci": ai_move.uci(),
        "san": san_move,
        "fen_before": fen_before,
        "fen_after": fen_after,
        "is_capture": is_capture,
        "is_check": is_check,
        "is_checkmate": is_checkmate,
        "created_at": datetime.now(timezone.utc),
    }

    result = database.moves.insert_one(move_document)
    move_document["_id"] = result.inserted_id

    database.games.update_one(
        {"_id": game["_id"]},
        {
            "$set": {
                "current_fen": fen_after,
                "current_turn": next_turn,
                "status": game_status,
                "result": game_result,
                "completed_at": completed_at,
            }
        },
    )

    return jsonify(
        {
            "success": True,
            "message": "ChessCure AI move completed.",
            "ai_level": ai_level,
            "move": serialize_move(move_document),
            "game": {
                "id": str(game["_id"]),
                "current_fen": fen_after,
                "current_turn": next_turn,
                "status": game_status,
                "result": game_result,
                "secret_chat_open": game.get(
                    "secret_chat_open",
                    False,
                ),
            },
        }
    ), 200

@games_blueprint.post("/<game_id>/moves")
def make_player_move(game_id):
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
                "message": (
                    "from_square and to_square are required."
                ),
            }
        ), 400

    if promotion not in ("", "q", "r", "b", "n"):
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

    board_before = board.copy(stack=False)

    fen_before = board.fen()
    san_move = board.san(move)
    is_capture = board.is_capture(move)

    board.push(move)

    analysis = analyze_human_move(
        board_before,
        move,
        board,
    )

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

    elif board.is_game_over():
        game_status = "completed"
        game_result = "draw"
        completed_at = datetime.now(timezone.utc)

    move_document = {
        "game_id": game["_id"],
        "player_id": game["white_player_id"],
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

    move_result = database.moves.insert_one(
        move_document
    )

    move_document["_id"] = move_result.inserted_id

    trigger_event = None

    secret_chat_open = game.get(
        "secret_chat_open",
        False,
    )

    secret_chat_trigger = game.get(
        "secret_chat_trigger"
    )

    if analysis["significant"]:
        trigger_event = {
            "game_id": game["_id"],
            "move_id": move_document["_id"],
            "trigger_type": analysis["trigger_type"],
            "emotion": analysis["emotion"],
            "reason": analysis["reason"],
            "evaluation_before": (
                analysis["evaluation_before"]
            ),
            "evaluation_after": (
                analysis["evaluation_after"]
            ),
            "evaluation_change": (
                analysis["evaluation_change"]
            ),
            "chat_opened": True,
            "created_at": datetime.now(timezone.utc),
        }

        trigger_result = (
            database.trigger_events.insert_one(
                trigger_event
            )
        )

        trigger_event["_id"] = (
            trigger_result.inserted_id
        )

        secret_chat_open = True
        secret_chat_trigger = (
            analysis["trigger_type"]
        )

    stored_turn = (
        "black"
        if game_status == "active"
        else "white"
    )

    response_turn = (
        "black"
        if game_status == "active"
        else None
    )

    database.games.update_one(
        {"_id": game["_id"]},
        {
            "$set": {
                "current_fen": fen_after,
                "current_turn": stored_turn,
                "status": game_status,
                "result": game_result,
                "completed_at": completed_at,
                "secret_chat_open": secret_chat_open,
                "secret_chat_trigger": (
                    secret_chat_trigger
                ),
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
                "current_turn": response_turn,
                "status": game_status,
                "result": game_result,
                "secret_chat_open": (
                    secret_chat_open
                ),
                "secret_chat_trigger": (
                    secret_chat_trigger
                ),
            },
            "trigger": (
                {
                    "id": str(trigger_event["_id"]),
                    "type": trigger_event[
                        "trigger_type"
                    ],
                    "emotion": trigger_event[
                        "emotion"
                    ],
                    "reason": trigger_event[
                        "reason"
                    ],
                    "chat_opened": True,
                }
                if trigger_event
                else None
            ),
        }
    ), 200
    
@games_blueprint.get("/<game_id>/history")
@jwt_required()
def get_game_history(game_id):
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

    moves = list(
        database.moves.find(
            {"game_id": game["_id"]}
        ).sort("move_number", 1)
    )

    serialized_moves = [
        serialize_move(move)
        for move in moves
    ]

    last_move_fen = (
        moves[-1]["fen_after"]
        if moves
        else STARTING_FEN
    )

    state_is_consistent = (
        last_move_fen == game["current_fen"]
    )

    return jsonify(
        {
            "success": True,
            "game": {
                "id": str(game["_id"]),
                "human_player_id": str(
                    game["white_player_id"]
                ),
                "opponent": {
                    "type": "ai",
                    "name": "ChessCure AI",
                    "level": game.get(
                        "ai_level",
                        "medium",
                    ),
                    "color": "black",
                },
                "current_fen": game["current_fen"],
                "current_turn": game.get(
                    "current_turn"
                ),
                "status": game["status"],
                "result": game.get(
                    "result",
                    "pending",
                ),
                "secret_chat_open": game.get(
                    "secret_chat_open",
                    False,
                ),
                "secret_chat_trigger": game.get(
                    "secret_chat_trigger"
                ),
                "created_at": (
                    game["created_at"].isoformat()
                ),
                "completed_at": (
                    game["completed_at"].isoformat()
                    if game.get("completed_at")
                    else None
                ),
            },
            "move_count": len(serialized_moves),
            "moves": serialized_moves,
            "state_is_consistent": state_is_consistent,
        }
    ), 200