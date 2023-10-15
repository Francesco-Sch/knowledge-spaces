from fastapi import HTTPException
from loader import _20Newsgroups


async def get_dataset_entry(dataset_name: str, id: int):
    if dataset_name == "20newsgroups":
        dataset = _20Newsgroups.data

        return dataset[id]

    else:
        raise HTTPException(status_code=404, detail=f"Unknown dataset: {dataset_name}")
