from datasets import load_dataset

async def get_all_embeddings():
    dataset = load_dataset("fscheffczyk/2D_20newsgroup_embeddings", split="train")
    dict_data = dataset.to_dict()

    converted_data = list(zip(dict_data["0"], dict_data["1"]))

    return converted_data