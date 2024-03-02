# Load the needed models and datasets for the application
# This is done here to avoid loading them multiple times

import os

import torch
from datasets import load_dataset, load_from_disk
from sentence_transformers import SentenceTransformer
from sklearn.datasets import fetch_20newsgroups

# ----- DATASETS -----

# -- 20newsgroups --

# Load the 2D embeddings of 20newsgroups dataset
if os.path.exists("./data/datasets/2D_20newsgroups_embeddings"):
    _2D_20Newsgroups = load_from_disk("./data/datasets/2D_20newsgroups_embeddings")
else:
    _2D_20Newsgroups = load_dataset(
        "fscheffczyk/2D_20newsgroups_embeddings", split="train"
    )
    _2D_20Newsgroups.save_to_disk("./data/datasets/2D_20newsgroups_embeddings")

# Load the embeddings of 20newsgroups dataset
if os.path.exists("./data/datasets/20newsgroups_embeddings"):
    _20Newsgroups_Embeddings = load_from_disk("./data/datasets/20newsgroups_embeddings")
else:
    _20Newsgroups_Embeddings = load_dataset(
        "fscheffczyk/20newsgroups_embeddings", split="train"
    )
    _20Newsgroups_Embeddings.save_to_disk("./data/datasets/20newsgroups_embeddings")

# Load the 20newsgroups dataset
_20Newsgroups = fetch_20newsgroups(
    data_home="./data/datasets/20Newsgroups", remove=("headers", "footers", "quotes")
)

# ----- MODELS -----

# Check if cuda is available
if torch.cuda.is_available():
    print("Using CUDA")
    model = SentenceTransformer(
        "multi-qa-MiniLM-L6-cos-v1", device="cuda", cache_folder="./data/models"
    )
else:
    print("Using CPU")
    model = SentenceTransformer(
        "multi-qa-MiniLM-L6-cos-v1", device="cpu", cache_folder="./data/models"
    )
