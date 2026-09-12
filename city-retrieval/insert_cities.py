"""Insert structured city documents into MongoDB."""
import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parent
DEFAULT_CITY_DIR = ROOT / "cities"


def load_city_document(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file:
        document = json.load(file)

    city_id = document.get("cityId")
    eras = document.get("eras")
    if not city_id or not isinstance(eras, list) or not eras:
        raise ValueError(f"{path} must contain cityId and a non-empty eras array")

    for era in eras:
        if not era.get("eraId") or not isinstance(era.get("buildings"), list):
            raise ValueError(f"{path} has an invalid era: {era.get('eraId')}")

    return document


def insert_documents(paths: list[Path]) -> int:
    load_dotenv(ROOT / ".env")
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        raise ValueError("Set MONGODB_URI in city-retrieval/.env")

    client = MongoClient(mongo_uri)
    try:
        database = client[os.getenv("MONGODB_DATABASE", "city_rag")]
        collection = database[os.getenv("MONGODB_CITIES_COLLECTION", "cities")]
        collection.create_index("cityId", unique=True)

        inserted = 0
        for path in paths:
            document = load_city_document(path)
            collection.replace_one(
                {"cityId": document["cityId"]},
                document,
                upsert=True,
            )
            inserted += 1
            print(f"Upserted {document['cityId']} from {path.name}")
        return inserted
    finally:
        client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "files",
        nargs="*",
        type=Path,
        help="JSON files to insert; defaults to every JSON file in cities/.",
    )
    args = parser.parse_args()

    paths = args.files or sorted(DEFAULT_CITY_DIR.glob("*.json"))
    if not paths:
        parser.error("No city JSON files found")

    count = insert_documents(paths)
    print(f"Upserted {count} city document(s)")


if __name__ == "__main__":
    main()
