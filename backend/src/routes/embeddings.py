from fastapi import APIRouter

import crud.embeddings as crud

router = APIRouter()

@router.get(
    "/embeddings/{dataset_name}",
)
async def get_embeddings(dataset_name: str):
    return await crud.get_embeddings(dataset_name)
