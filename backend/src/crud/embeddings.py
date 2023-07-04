from typing import Annotated
from fastapi import HTTPException, Query
from loader import _2D_20Newsgroups


async def get_embeddings(dataset_name: str, ids):
    if dataset_name == "20newsgroups":
        dataset = _2D_20Newsgroups
        dict_data = dataset.to_dict()

        converted_data = list(zip(dict_data["0"], dict_data["1"]))

        if ids != None:
            converted_data = [converted_data[i] for i in ids]

        return converted_data

    else:
        raise HTTPException(status_code=404, detail=f"Unknown dataset: {dataset_name}")
