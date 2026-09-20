from pymongo import ASCENDING, DESCENDING, MongoClient

from pymongo import ASCENDING


def create_indexes(database):
    database.users.create_index(
        [("email", ASCENDING)],
        unique=True,
    )

    database.users.create_index(
        [("username", ASCENDING)],
        unique=True,
    )

    database.games.create_index(
        [
            ("white_player_id", ASCENDING),
            ("created_at", DESCENDING),
        ]
    )

    database.games.create_index(
        [
            ("black_player_id", ASCENDING),
            ("created_at", DESCENDING),
        ]
    )

    database.games.create_index(
        [("status", ASCENDING)]
    )

    database.moves.create_index(
        [
            ("game_id", ASCENDING),
            ("move_number", ASCENDING),
        ],
        unique=True,
    )

    database.trigger_events.create_index(
        [
            ("game_id", ASCENDING),
            ("created_at", ASCENDING),
        ]
    )

    database.messages.create_index(
        [
            ("game_id", ASCENDING),
            ("created_at", ASCENDING),
        ]
    )

    database.reports.create_index(
        [
            ("status", ASCENDING),
            ("created_at", DESCENDING),
        ]
    )

    database.blocks.create_index(
        [
            ("blocker_id", ASCENDING),
            ("blocked_user_id", ASCENDING),
        ],
        unique=True,
    )

    print("Database indexes created successfully")