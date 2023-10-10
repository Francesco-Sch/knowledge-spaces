from fastapi import HTTPException
from loader import model, _20Newsgroups
import torch
from sentence_transformers import util


async def search(dataset_name: str, query: str, k: int = 1):
    print(f"Searching for {query} in {dataset_name}...")

    # Load the dataset
    if dataset_name == "20newsgroups":
        dataset = _20Newsgroups
    else:
        raise HTTPException(status_code=404, detail=f"Unknown dataset: {dataset_name}")

    embeddings = [list(example.values()) for example in dataset]
    embeddings_tensor = torch.tensor(embeddings)

    query_embedding = model.encode(query, convert_to_tensor=True)

    top_similar_results = util.semantic_search(
        query_embedding, embeddings_tensor, top_k=k
    )

    print(top_similar_results)

    return top_similar_results
