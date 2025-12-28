-- Migration: Seed initial episodes from episodes.json
-- Created: 2024-12-27

INSERT INTO episodes (id, title, authors, year, duration, duration_seconds, description, audio_url, transcript_url, paper_url) VALUES
(
    'punica-2023',
    'Punica: Multi-Tenant LoRA Serving',
    'Chen et al.',
    2023,
    '14 min',
    840,
    'Efficient multi-tenant LoRA serving via SGMV kernels: batch requests across different adapters for 12x higher throughput.',
    'https://strollcast.com/chen-2023-punica/chen-2023-punica.m4a',
    'https://strollcast.com/api/punica-2023.vtt',
    'https://arxiv.org/abs/2310.18547'
),
(
    'qlora-2023',
    'QLoRA: Efficient Finetuning of Quantized LLMs',
    'Dettmers et al.',
    2023,
    '15 min',
    900,
    'Democratizing LLM fine-tuning: 4-bit quantization plus LoRA enables training 65B models on a single GPU.',
    'https://strollcast.com/dettmers-2023-qlora/dettmers-2023-qlora.m4a',
    'https://strollcast.com/api/qlora-2023.vtt',
    'https://arxiv.org/abs/2305.14314'
),
(
    'gated-attention-2025',
    'Gated Attention for Large Language Models',
    'Qiu et al.',
    2025,
    '35 min',
    2100,
    'NeurIPS 2025 Best Paper: A simple sigmoid gate after attention eliminates attention sinks, improves training stability, and enables million-token contexts.',
    'https://strollcast.com/qiu-2025-gated-attention/qiu-2025-gated-attention.m4a',
    NULL,
    'https://arxiv.org/abs/2505.06708'
),
(
    'pathways-2022',
    'Pathways: Asynchronous Distributed Dataflow for ML',
    'Barham et al.',
    2022,
    '29 min',
    1740,
    'Google''s orchestration layer for accelerators using asynchronous dataflow, enabling flexible parallelism across thousands of TPUs.',
    'https://strollcast.com/barham-2022-pathways/barham-2022-pathways.m4a',
    NULL,
    'https://arxiv.org/abs/2203.12533'
),
(
    'megatron-lm-2021',
    'Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM',
    'Narayanan et al.',
    2021,
    '34 min',
    2040,
    'NVIDIA''s techniques for training trillion-parameter models across thousands of GPUs using tensor, pipeline, and data parallelism.',
    'https://strollcast.com/narayanan-2021-megatron-lm/narayanan-2021-megatron-lm.m4a',
    NULL,
    'https://arxiv.org/abs/2104.04473'
),
(
    'pytorch-fsdp-2023',
    'PyTorch FSDP: Experiences on Scaling Fully Sharded Data Parallel',
    'Zhao et al.',
    2023,
    '24 min',
    1440,
    'Meta''s production experiences building fully sharded data parallel training into PyTorch.',
    'https://strollcast.com/zhao-2023-pytorch-fsdp/zhao-2023-pytorch-fsdp.m4a',
    NULL,
    'https://arxiv.org/abs/2304.11277'
),
(
    'zero-2020',
    'ZeRO: Memory Optimizations Toward Training Trillion Parameter Models',
    'Rajbhandari et al.',
    2020,
    '17 min',
    1020,
    'Microsoft''s breakthrough technique for eliminating memory redundancy in distributed training, enabling trillion-parameter models.',
    'https://strollcast.com/rajbhandari-2020-zero/rajbhandari-2020-zero.m4a',
    NULL,
    'https://arxiv.org/abs/1910.02054'
);
