import os

from pymongo import MongoClient


MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb://127.0.0.1:27017",
)

DATABASE_NAME = os.getenv(
    "MONGO_DB_NAME",
    "chescure_db",
)


def check_database():
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000,
    )

    try:
        client.admin.command("ping")
        database = client[DATABASE_NAME]

        collection_names = sorted(database.list_collection_names())

        print(f"Database: {DATABASE_NAME}")
        print(f"Total collections: {len(collection_names)}")
        print()

        for collection_name in collection_names:
            collection = database[collection_name]
            indexes = collection.index_information()

            print(f"Collection: {collection_name}")
            print(f"Documents: {collection.count_documents({})}")
            print("Indexes:")

            for index_name in indexes:
                print(f"  - {index_name}")

            print()

    except Exception as error:
        print(f"Database check failed: {error}")
        raise

    finally:
        client.close()


if __name__ == "__main__":
    check_database()