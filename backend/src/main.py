from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import embeddings

app = FastAPI()

# --- Middleware --- 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(embeddings.router)

@app.get("/")
def home():
    return "This is the API for the knowledge spaces project by Francesco Scheffczyk."