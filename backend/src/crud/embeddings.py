from fastapi import HTTPException
from datasets import load_dataset

def get_2D_20newsgroup_embeddings():
    dataset = load_dataset("fscheffczyk/2D_20newsgroup_embeddings", split="train")
    json_data = dataset.to_dict()
    return json_data

async def get_embeddings(dataset_name: str):
    if dataset_name == "2D_20newsgroup_embeddings":
        return get_2D_20newsgroup_embeddings()
    else:
        raise HTTPException(status_code=404, detail=f"Unknown dataset: {dataset_name}")
    
