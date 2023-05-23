from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routes import newsgroups

app = FastAPI()

# --- Middleware --- 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5137"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(newsgroups.router)

@app.get("/")
def home():
    return "Hello, World!"
