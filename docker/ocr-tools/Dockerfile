# PRISM OCR Tools Container
# ================================
# Purpose: Run mechanical-drawing OCR tools (eDOCr, PaddleOCR, MinerU) that
# refused to install on the host's portable Python 3.13 + Windows env.
# Linux + Python 3.11 has prebuilt wheels for everything we need.
#
# Build:  docker build -f H:/prism/docker/ocr-tools/Dockerfile -t prism-ocr-tools .
# Run:    docker run --rm --gpus all \
#           -v "H:/PRISM/Docustrata:/work/Docustrata:ro" \
#           -v "H:/prism/Docustrata/.index:/work/index" \
#           -v "C:/Users/wompu/.cache/huggingface:/root/.cache/huggingface" \
#           prism-ocr-tools python /app/run-benchmark.py 50

FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/root/.cache/huggingface \
    TZ=America/Chicago

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-venv python3.11-dev python3-pip \
    build-essential \
    tesseract-ocr tesseract-ocr-eng \
    poppler-utils \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    libgomp1 libgtk-3-0 \
    git ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3.11 /usr/bin/python && \
    python -m pip install --upgrade pip setuptools wheel

# Layer 1: Common scientific stack (cached)
RUN pip install \
    "numpy<2.0" "pillow>=10" \
    "pymupdf>=1.24" "pytesseract>=0.3.10" \
    "shapely" "pyclipper" "rapidfuzz" "lmdb" "imgaug"

# Layer 2: PaddleOCR + paddlepaddle-gpu (CUDA 12.x build)
# paddlepaddle-gpu wheel for cu126 works against CUDA 12.4 driver via runtime API
RUN pip install --pre paddlepaddle-gpu==3.0.0b1 \
    -i https://www.paddlepaddle.org.cn/packages/stable/cu126/ \
    || pip install paddlepaddle  # fallback to CPU if GPU wheel fails
RUN pip install paddleocr==2.7.3 opencv-python==4.6.0.66 fire pdf2docx visualdl

# Layer 3: MinerU
RUN pip install "mineru[core]>=3.1,<4.0"

# Layer 4: eDOCr (Linux + Python 3.11 has working wheels)
# Note: eDOCr is keras-ocr based → installs TensorFlow 2.18+
RUN pip install editdistance \
    && pip install eDOCr || echo "WARN: eDOCr canonical install failed; eDOCr-javvi51 fallback available"

# Layer 5: Application code
WORKDIR /app
COPY run-benchmark.py /app/

CMD ["python", "/app/run-benchmark.py", "5"]
