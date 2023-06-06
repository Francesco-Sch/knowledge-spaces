from fastapi import APIRouter

import crud.embeddings as embeddings

router = APIRouter()

@router.get(
    "/embeddings/{dataset_name}",
)
async def get_embeddings(dataset_name: str):
    return await embeddings.get_embeddings(dataset_name)