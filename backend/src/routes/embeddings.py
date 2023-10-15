from typing import Annotated
from fastapi import APIRouter, Query

import crud.embeddings as embeddings

router = APIRouter()


@router.get(
    "/embeddings/{dataset_name}",
)
async def get_embeddings(
    dataset_name: str, ids: Annotated[list[int] | None, Query()] = None
):
    return await embeddings.get_embeddings(dataset_name, ids)
