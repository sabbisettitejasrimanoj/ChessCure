from flask import current_app
from pymongo import MongoClient
from pymongo.errors import PyMongoError


def initialize_database(app):
    mongo_uri = app.config["MONGO_URI"]
    database_name = app.config["MONGO_DB_NAME"]

    client = MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
    )

    database = client[database_name]

    app.extensions["mongo_client"] = client
    app.extensions["mongo_db"] = database


def get_database():
    return current_app.extensions["mongo_db"]


def check_database_connection():
    try:
        client = current_app.extensions["mongo_client"]

        client.admin.command("ping")

        return {
            "connected": True,
            "message": "MongoDB connection successful",
            "database": current_app.config["MONGO_DB_NAME"],
        }

    except PyMongoError as error:
        return {
            "connected": False,
            "message": "MongoDB connection failed",
            "error": str(error),
        }