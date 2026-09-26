import os
from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO

from app.database import get_database, initialize_database


jwt = JWTManager()

socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="threading",
)


def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.getenv(
        "SECRET_KEY",
        "chescure-flask-development-secret",
    )

    app.config["JWT_SECRET_KEY"] = os.getenv(
        "JWT_SECRET_KEY",
        "chescure-jwt-development-secret",
    )

    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=2)

    CORS(app)

    jwt.init_app(app)

    # This line fixes the SocketIO NoneType error.
    socketio.init_app(
        app,
        cors_allowed_origins="*",
    )

    initialize_database(app)

    from app.auth import auth_blueprint
    from app.games import games_blueprint

    app.register_blueprint(games_blueprint)
    app.register_blueprint(auth_blueprint)

    @app.get("/")
    def home():
        return jsonify(
            {
                "success": True,
                "message": "ChessCure backend is running",
                "health_url": "/api/health",
                "database_health_url": "/api/health/database",
            }
        )

    @app.get("/api/health")
    def health():
        return jsonify(
            {
                "success": True,
                "status": "healthy",
                "message": "ChessCure API is healthy",
            }
        )

    @app.get("/api/health/database")
    def database_health():
        try:
            database = get_database()
            database.command("ping")

            return jsonify(
                {
                    "success": True,
                    "connected": True,
                    "database": database.name,
                    "status": "healthy",
                    "message": "MongoDB connection successful",
                }
            ), 200

        except Exception as error:
            return jsonify(
                {
                    "success": False,
                    "connected": False,
                    "status": "unhealthy",
                    "message": str(error),
                }
            ), 500

    return app