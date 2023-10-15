from fastapi import APIRouter

import crud.dataset_entry as dataset_entry

router = APIRouter()


@router.get(
    "/dataset-entry/{dataset_name}/{id}",
)
async def get_dataset_entry(dataset_name: str, id: int):
    return await dataset_entry.get_dataset_entry(dataset_name, id)
