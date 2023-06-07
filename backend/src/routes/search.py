from fastapi import APIRouter

import crud.search as search_func

router = APIRouter()

@router.get("/search/{dataset_name}")
async def search(dataset_name: str, query: str, num_samples: int = 1):
    return await search_func.search(dataset_name, query, num_samples)