from fastapi import HTTPException
import torch
from sentence_transformers import SentenceTransformer, util
from datasets import load_dataset

async def search(dataset_name: str, query: str, num_samples: int = 1):
    # Check if cuda is available
    if torch.cuda.is_available():
        print("Using CUDA")
        model = SentenceTransformer('multi-qa-MiniLM-L6-cos-v1', device='cuda', cache_folder="../models")
    else:
        print("Using CPU")
        model = SentenceTransformer('multi-qa-MiniLM-L6-cos-v1', device='cpu', cache_folder="../models")
    
    # Load the dataset
    if dataset_name == "20newsgroups":
        dataset = load_dataset("fscheffczyk/20newsgroups_embeddings", split="train")
    else:
        raise HTTPException(status_code=404, detail=f"Unknown dataset: {dataset_name}")

    embeddings = [list(example.values()) for example in dataset]
    embeddings_tensor = torch.tensor(embeddings)

    query_embedding = model.encode(query, convert_to_tensor=True)

    top_similar_results = util.semantic_search(query_embedding, embeddings_tensor, top_k=num_samples)

    return top_similar_results
