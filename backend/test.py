from transformers import pipeline

pipe = pipeline("text-generation", model="microsoft/Phi-3-mini-4k-instruct")
out = pipe("Was kannst du?", max_new_tokens=50, do_sample=True, temperature=0.7)
print(out)