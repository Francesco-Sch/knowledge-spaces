# Load the needed models and datasets for the application
# This is done here to avoid loading them multiple times

import torch
from sentence_transformers import SentenceTransformer
from datasets import load_dataset

# ----- DATASETS -----
# Load the 2D 20newsgroups dataset
_2D_20Newsgroups = load_dataset("fscheffczyk/2D_20newsgroups_embeddings", split="train")

# Load the 20newsgroups dataset
_20Newsgroups = load_dataset("fscheffczyk/20newsgroups_embeddings", split="train")

# ----- MODELS -----

# Check if cuda is available
if torch.cuda.is_available():
    print("Using CUDA")
    model = SentenceTransformer('multi-qa-MiniLM-L6-cos-v1', device='cuda', cache_folder="../models")
else:
    print("Using CPU")
    model = SentenceTransformer('multi-qa-MiniLM-L6-cos-v1', device='cpu', cache_folder="../models")