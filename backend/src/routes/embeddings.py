from fastapi import APIRouter

import crud.embeddings as embed

router = APIRouter()

@router.get(
    "/embeddings/{dataset_name}",
)
async def get_embeddings(dataset_name: str):
    return await embed.get_embeddings(dataset_name)