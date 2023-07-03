from typing import Annotated
from fastapi import HTTPException, Query
from loader import _2D_20Newsgroups


def all_2D_20newsgroup_embeddings():
    dataset = _2D_20Newsgroups
    dict_data = dataset.to_dict()

    converted_data = list(zip(dict_data["0"], dict_data["1"]))

    return converted_data


def specific_2D_20newsgroup_embeddings(ids):
    dataset = _2D_20Newsgroups
    dict_data = dataset.to_dict()

    converted_data = list(zip(dict_data["0"], dict_data["1"]))

    converted_data = [converted_data[i] for i in ids]

    return converted_data


async def get_embeddings(dataset_name: str, ids):
    if dataset_name == "20newsgroups":
        print(ids)

        if ids != None:
            return specific_2D_20newsgroup_embeddings(ids)
        else:
            return all_2D_20newsgroup_embeddings()
    else:
        raise HTTPException(status_code=404, detail=f"Unknown dataset: {dataset_name}")
