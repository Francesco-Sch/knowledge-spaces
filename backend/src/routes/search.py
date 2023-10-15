from fastapi import APIRouter

import crud.search as search_func

router = APIRouter()


@router.get("/search/{dataset_name}")
async def search(dataset_name: str, query: str, k: int = 1):
    return await search_func.search(dataset_name, query, k)
