import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import dataset_entry, embeddings, search

app = FastAPI()

# --- CORS ---
if os.environ.get("FRONTEND_URL"):
    origins = [os.environ.get("FRONTEND_URL")]
else:
    origins = ["http://localhost", "http://localhost:3000", "http://localhost:8080"]

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
