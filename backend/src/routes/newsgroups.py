from fastapi import APIRouter, Depends, HTTPException

import src.crud.newsgroups as crud

router = APIRouter()

@router.get(
    "/newsgroups",
)
async def get_all_embeddings():
    return await crud.get_all_embeddings()
