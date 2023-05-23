from fastapi import APIRouter

import crud.newsgroups as crud

router = APIRouter()

@router.get(
    "/newsgroups",
)
async def get_all_embeddings():
    return await crud.get_all_embeddings()
