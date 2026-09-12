# City retrieval: OpenAI + MongoDB Atlas

A small Python 3.10+ retrieval starter with three direct dependencies. It embeds city text, stores overlapping chunks in Atlas, and returns relevant chunks and metadata as JSON. No LangChain, scraping service, or answer-generation model is needed.

## 1. Create Atlas resources

1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register), create a project, and deploy a cluster with Vector Search support (use the free option if available for your account).
2. Under **Database Access**, add a database user with `readWrite` access to the `city_rag` database. This is separate from your Atlas website login.
3. Under **Network Access**, allow your current public IP address.
4. Open the cluster's **Browse Collections / Data Explorer**, choose **Create Database**, and enter database `city_rag` and collection `city_chunks`. Use a regular collection. Ingestion can also create these implicitly on the first write.
5. Choose **Connect → Drivers → Python**, and copy the `mongodb+srv://...` connection string. Replace the username and password placeholders. Percent-encode special characters in the username/password, not the entire URI.

Atlas interface labels can vary. Keep database and collection names consistent with `.env`.

## 2. Install and configure

Run these commands inside this project folder.

macOS / Linux:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Windows PowerShell (activation is unnecessary):

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` with your MongoDB URI and an [OpenAI API key](https://platform.openai.com/api-keys) with embedding access and API billing/quota. Keep `.env` out of version control; `.gitignore` already excludes it. Document chunks and queries are sent to OpenAI to generate embeddings. Running ingestion again makes new embedding calls.

The commands below use `python`; on Windows, substitute `.\.venv\Scripts\python.exe`.

## 3. Ingest sample documents

```sh
python ingest.py
```

This loads the authored Toronto, Montreal, and Vancouver examples from `sample_cities.json`. Their `sample://` source URLs identify demo content; they are not scraped pages or verified travel citations.

Text is normalized and split into 1,000-character windows with 150-character overlap. Each chunk gets a city/country/title prefix. Character splitting can cut through words; it keeps this starter independent of a tokenizer. Small windows and batches of 16 bound request sizes. OpenAI returns 1,536-dimensional vectors using `text-embedding-3-small`; both scripts share that configuration and use `OpenAI().embeddings.create(...)` with typed response attributes. See the [OpenAI embeddings guide](https://developers.openai.com/api/docs/guides/embeddings).

Documents contain `text`, `embedding`, `city`, `country`, `category`, `title`, `source_url`, `source_id`, `chunk_index`, model/dimension metadata, and a UTC update timestamp. Stable source/chunk IDs make repeated ingestion replace existing chunks. If a source gets shorter, its obsolete tail chunks are removed after the new chunks are stored. Sources removed from the input file remain in MongoDB. Use a dedicated collection for this demo; do not run concurrent ingestions. Writes are not atomic across a whole source; rerun after a partial failure.

## 4. Create the Vector Search index

In the cluster's **Search / Vector Search** area, choose **Create Search Index**, select **Vector Search**, and use the **JSON editor**. Select database `city_rag`, collection `city_chunks`, and index name **`city_vector_index`**. For an embedding option, select existing / bring-your-own embeddings; these scripts generate vectors themselves.

Paste the contents of `vector_index.json` as the index definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    { "type": "filter", "path": "city" }
  ]
}
```

Create it and wait until Atlas shows the index is ready/queryable. This is a **Vector Search index** (type `vectorSearch`), not a regular collection index or a text Search index. The index name must match `MONGODB_VECTOR_INDEX`. See [MongoDB's index definition example](https://learn.mongodb.com/learn/course/managing-atlas-vector-search-indexes/lesson-1-managing-atlas-vector-search-indexes-in-the-atlas-cli/learn?page=2).

Use an Atlas identity authorized to manage search indexes. Vector indexing is asynchronous, including after later ingestion runs.

## 5. Retrieve

```sh
python retrieve.py "Where can I find ocean views and forest walks?" --top-k 3
python retrieve.py "Museums and art galleries" --city Toronto --top-k 2
python retrieve.py "Historic streets and bagels" --top-k 1
```

Standard output is a JSON array. Each result includes chunk text, city, country, category, title, source URL, source ID, chunk index, ID, and similarity score. Embedding vectors are excluded. A larger score means greater similarity, not factual confidence; unrelated questions can still return matches. Results are approximate and may contain fewer than k chunks when the collection or city filter has fewer matches. The city filter is an exact, case-sensitive name match.

The query uses `$vectorSearch` as the first aggregation stage, `limit=top_k`, and `numCandidates=max(100, 20 * top_k)`, following [MongoDB's query guidance](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage/?interface=driver&language=nodejs). `--top-k` supports 1–100; query length is limited to 2,000 characters.

## Bring your own data

Use the same JSON array schema as `sample_cities.json`, with a stable unique `id` per source and non-empty strings for every field:

```json
[
  {
    "id": "my-city-parks-page",
    "city": "Example City",
    "country": "Example Country",
    "category": "parks",
    "title": "Parks guide",
    "source_url": "https://example.com/parks",
    "text": "Your cleaned source text goes here."
  }
]
```

```sh
python ingest.py --file my_cities.json
```

Preserve IDs when editing sources. Keep combined city/country/title text short (under 500 characters). Avoid mixing embedding models in one collection. If you change the model or dimensions in `common.py`, use a new collection, re-embed all documents, and create a matching index. Retrieval must use the same model and dimension count as ingestion.

## Troubleshooting

- **Connection timeout:** check the Atlas IP allowlist, cluster status, network/DNS access, and URI hostname.
- **Authentication failure:** use database-user credentials, verify permissions, and percent-encode special password characters.
- **OpenAI 401 or 429:** check the API key, API billing/quota, and rate limits. The SDK retries transient failures twice.
- **Empty results:** confirm ingestion wrote documents, the database/collection/index names match, the index is queryable, and the exact city filter matches stored metadata. Wait for indexing to catch up.
- **Dimension mismatch or filter error:** use the supplied index with `embedding` at 1,536 dimensions and `city` as a filter field.

## Verification

`python -m unittest discover -s tests -v` runs offline checks with mocked service boundaries. It checks chunk coverage, validation, rerun behavior, stale-chunk cleanup, and query construction. A live smoke test requires your credentials: ingest the samples, wait for the index, then run the three retrieval commands above. This project returns retrieved context; adding an LLM answer-generation step is optional follow-on work.

All seven offline tests and both command-line help checks passed on Python 3.11.5 with OpenAI 2.54.0, PyMongo 4.18.1, and python-dotenv 1.2.3. Live OpenAI/Atlas calls were not tested; credentials were not supplied. Dependency ranges allow compatible updates; pin the tested versions if you need an identical demo environment.
