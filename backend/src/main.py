from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import embeddings, search, dataset_entry

app = FastAPI()

# --- CORS ---
# origins = ["http://localhost:5173", "http://localhost:8080"]
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTER ---
app.include_router(embeddings.router)
app.include_router(search.router)
app.include_router(dataset_entry.router)

# add debug mode
app.debug = True


# --- STARTUP ---
@app.get("/")
def home():
    return "This is the API for the knowledge spaces project by Francesco Scheffczyk."
