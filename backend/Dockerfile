FROM python:3.10.12 AS base
ENV PYTHONUNBUFFERED 1

RUN mkdir app
WORKDIR /app

ENV PATH="${PATH}:/root/.local/bin"
ENV PYTHONPATH=.

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY src/ .

FROM base AS development
CMD ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "7100"]

FROM base AS production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7100"]