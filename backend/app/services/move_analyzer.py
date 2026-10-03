import chess


MATERIAL_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0,
}


def calculate_material_score(board):
    score = 0

    for piece_type, value in MATERIAL_VALUES.items():
        white_count = len(
            board.pieces(piece_type, chess.WHITE)
        )
        black_count = len(
            board.pieces(piece_type, chess.BLACK)
        )

        score += white_count * value
        score -= black_count * value

    return score


def find_ai_piece_threat(board):
    threats = []

    for square, piece in board.piece_map().items():
        if piece.color != chess.BLACK:
            continue

        if piece.piece_type not in (
            chess.QUEEN,
            chess.ROOK,
        ):
            continue

        if board.is_attacked_by(chess.WHITE, square):
            threats.append(
                {
                    "piece": chess.piece_name(
                        piece.piece_type
                    ),
                    "square": chess.square_name(square),
                }
            )

    return threats


def analyze_human_move(
    board_before,
    move,
    board_after,
):
    is_capture = board_before.is_capture(move)
    is_check = board_after.is_check()
    is_checkmate = board_after.is_checkmate()

    material_before = calculate_material_score(
        board_before
    )
    material_after = calculate_material_score(
        board_after
    )

    evaluation_change = (
        material_after - material_before
    )

    threats = find_ai_piece_threat(board_after)

    trigger_type = None
    emotion = None
    reason = None

    if is_checkmate:
        trigger_type = "checkmate"
        emotion = "fear"
        reason = "The player checkmated ChessCure AI."

    elif is_check:
        trigger_type = "check"
        emotion = "fear"
        reason = "The player placed the AI king in check."

    elif is_capture:
        trigger_type = "capture"
        emotion = "confused"
        reason = "The player captured an AI piece."

    elif threats:
        threatened_piece = threats[0]

        trigger_type = "threat"
        emotion = "fear"
        reason = (
            f"The player is threatening the AI "
            f"{threatened_piece['piece']} on "
            f"{threatened_piece['square']}."
        )

    elif evaluation_change >= 300:
        trigger_type = "evaluation_change"
        emotion = "confused"
        reason = (
            "The player created a major material advantage."
        )

    return {
        "significant": trigger_type is not None,
        "trigger_type": trigger_type,
        "emotion": emotion,
        "reason": reason,
        "is_capture": is_capture,
        "is_check": is_check,
        "is_checkmate": is_checkmate,
        "evaluation_before": material_before,
        "evaluation_after": material_after,
        "evaluation_change": evaluation_change,
        "threats": threats,
    }