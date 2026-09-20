import os

from flask import Flask

from app.database import initialize_database
from app.errors import register_error_handlers
from app.extensions import cors, socketio
from app.routes import register_blueprints
from config import config_by_name


def create_app(config_name=None):
    app = Flask(__name__)

    if config_name is None:
        config_name = os.getenv(
            "FLASK_ENV",
            "development",
        )

    selected_config = config_by_name.get(
        config_name,
        config_by_name["development"],
    )

    app.config.from_object(selected_config)

    initialize_extensions(app)
    initialize_database(app)
    register_blueprints(app)
    register_error_handlers(app)

    @app.get("/")
    def home():
        return {
            "success": True,
            "message": "Chescure backend is running",
            "health_url": "/api/health",
            "database_health_url": "/api/health/database",
        }, 200

    return app


def initialize_extensions(app):
    frontend_url = app.config["FRONTEND_URL"]

    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": [frontend_url],
            }
        },
        supports_credentials=True,
    )

    socketio.init_app(
        app,
        cors_allowed_origins=[frontend_url],
    )