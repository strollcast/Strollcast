-- Migration: Seed initial episodes from episodes.json
-- Created: 2024-12-27
-- Updated: 2026-01-01 - Migrated episode IDs to new format: {lastname}-{year}-{title_slug}

INSERT INTO episodes (id, title, authors, year, duration, duration_seconds, description, audio_url, transcript_url, paper_url) VALUES
(
    'chen-2023-punica_multi_tenant',
    'Punica: Multi-Tenant LoRA Serving',
    'Chen et al.',
    2023,
    '14 min',
    840,
    'Efficient multi-tenant LoRA serving via SGMV kernels: batch requests across different adapters for 12x higher throughput.',
    'https://released.strollcast.com/episodes/chen-2023-punica_multi_tenant/chen-2023-punica_multi_tenant.m4a',
    'https://released.strollcast.com/episodes/chen-2023-punica_multi_tenant/chen-2023-punica_multi_tenant.vtt',
    'https://arxiv.org/abs/2310.18547'
),
(
    'dettmers-2023-qlora_efficient_fin',
    'QLoRA: Efficient Finetuning of Quantized LLMs',
    'Dettmers et al.',
    2023,
    '15 min',
    900,
    'Democratizing LLM fine-tuning: 4-bit quantization plus LoRA enables training 65B models on a single GPU.',
    'https://released.strollcast.com/episodes/dettmers-2023-qlora_efficient_fin/dettmers-2023-qlora_efficient_fin.m4a',
    'https://released.strollcast.com/episodes/dettmers-2023-qlora_efficient_fin/dettmers-2023-qlora_efficient_fin.vtt',
    'https://arxiv.org/abs/2305.14314'
),
(
    'qiu-2025-gated_attention_for',
    'Gated Attention for Large Language Models',
    'Qiu et al.',
    2025,
    '35 min',
    2100,
    'NeurIPS 2025 Best Paper: A simple sigmoid gate after attention eliminates attention sinks, improves training stability, and enables million-token contexts.',
    'https://released.strollcast.com/episodes/qiu-2025-gated_attention_for/qiu-2025-gated_attention_for.m4a',
    NULL,
    'https://arxiv.org/abs/2505.06708'
),
(
    'barham-2022-pathways_asynchrono',
    'Pathways: Asynchronous Distributed Dataflow for ML',
    'Barham et al.',
    2022,
    '29 min',
    1740,
    'Google''s orchestration layer for accelerators using asynchronous dataflow, enabling flexible parallelism across thousands of TPUs.',
    'https://released.strollcast.com/episodes/barham-2022-pathways_asynchrono/barham-2022-pathways_asynchrono.m4a',
    NULL,
    'https://arxiv.org/abs/2203.12533'
),
(
    'narayanan-2021-efficient_large_scal',
    'Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM',
    'Narayanan et al.',
    2021,
    '34 min',
    2040,
    'NVIDIA''s techniques for training trillion-parameter models across thousands of GPUs using tensor, pipeline, and data parallelism.',
    'https://released.strollcast.com/episodes/narayanan-2021-efficient_large_scal/narayanan-2021-efficient_large_scal.m4a',
    NULL,
    'https://arxiv.org/abs/2104.04473'
),
(
    'zhao-2023-pytorch_fsdp_experi',
    'PyTorch FSDP: Experiences on Scaling Fully Sharded Data Parallel',
    'Zhao et al.',
    2023,
    '24 min',
    1440,
    'Meta''s production experiences building fully sharded data parallel training into PyTorch.',
    'https://released.strollcast.com/episodes/zhao-2023-pytorch_fsdp_experi/zhao-2023-pytorch_fsdp_experi.m4a',
    NULL,
    'https://arxiv.org/abs/2304.11277'
),
(
    'rajbhandari-2020-zero_memory_optimiz',
    'ZeRO: Memory Optimizations Toward Training Trillion Parameter Models',
    'Rajbhandari et al.',
    2020,
    '17 min',
    1020,
    'Microsoft''s breakthrough technique for eliminating memory redundancy in distributed training, enabling trillion-parameter models.',
    'https://released.strollcast.com/episodes/rajbhandari-2020-zero_memory_optimiz/rajbhandari-2020-zero_memory_optimiz.m4a',
    NULL,
    'https://arxiv.org/abs/1910.02054'
);
