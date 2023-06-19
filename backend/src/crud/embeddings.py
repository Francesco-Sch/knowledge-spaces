from fastapi import HTTPException
from loader import _2D_20Newsgroups

def get_2D_20newsgroup_embeddings():
    dataset = _2D_20Newsgroups
    dict_data = dataset.to_dict()

    converted_data = list(zip(dict_data["0"], dict_data["1"]))

    return converted_data

async def get_embeddings(dataset_name: str):
    if dataset_name == "20newsgroups":
        return get_2D_20newsgroup_embeddings()
    else:
        raise HTTPException(status_code=404, detail=f"Unknown dataset: {dataset_name}")
    
