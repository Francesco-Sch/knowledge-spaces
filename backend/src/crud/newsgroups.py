from datasets import load_dataset

async def get_all_embeddings():
    dataset = load_dataset("fscheffczyk/2D_20newsgroup_embeddings", split="train")
    json_data = dataset.to_dict()
    return json_data