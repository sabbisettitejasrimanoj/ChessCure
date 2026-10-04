import os

from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

from app.database import get_database, initialize_database
from app.errors import register_error_handlers
from config import config_by_name


socketio = SocketIO(async_mode="threading")


def create_app(config_name=None):
    app = Flask(__name__)
    selected_config = config_name or os.getenv("FLASK_ENV", "development")
    config_class = config_by_name.get(selected_config)
    if config_class is None:
        raise ValueError(f"Unknown Flask configuration: {selected_config}")

    app.config.from_object(config_class)
    register_error_handlers(app)
    frontend_url = app.config["FRONTEND_URL"]
    CORS(app, origins=[frontend_url])
    socketio.init_app(app, cors_allowed_origins=[frontend_url])

    if app.config["INITIALIZE_DATABASE"]:
        initialize_database(app.config)

    from app.games import games_blueprint

    app.register_blueprint(games_blueprint)

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
                "service": "ChessCure Backend",
            }
        )

    @app.get("/api/health/database")
    def database_health():
        try:
            current_database = get_database()
            current_database.command("ping")
            return jsonify(
                {
                    "success": True,
                    "connected": True,
                    "database": current_database.name,
                    "status": "healthy",
                    "message": "MongoDB connection successful",
                }
            ), 200
        except Exception as error:
            app.logger.exception("MongoDB health check failed")
            return jsonify(
                {
                    "success": False,
                    "connected": False,
                    "status": "unhealthy",
                    "message": str(error),
                }
            ), 500

    return app
