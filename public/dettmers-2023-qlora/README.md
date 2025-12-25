# QLoRA: Efficient Finetuning of Quantized LLMs

**Authors:** Tim Dettmers, Artidoro Pagnoni, Ari Holtzman, Luke Zettlemoyer (University of Washington)
**Year:** 2023
**Venue:** NeurIPS 2023
**Paper:** https://arxiv.org/abs/2305.14314
**Code:** https://github.com/artidoro/qlora

## Summary

This podcast episode covers QLoRA, a technique that democratized large language model fine-tuning by combining 4-bit quantization with Low-Rank Adaptation (LoRA). QLoRA enables fine-tuning a 65B parameter model on a single 48GB GPU while matching full 16-bit fine-tuning performance.

## Topics Covered

- The memory problem in LLM fine-tuning
- LoRA (Low-Rank Adaptation) background
- 4-bit NormalFloat (NF4) quantization
- Double quantization for scaling factors
- Paged optimizers for memory spike handling
- The Guanaco model family (99.3% of ChatGPT performance)
- Practical implementation with bitsandbytes and PEFT
- Limitations and subsequent work

## Quizzes

The episode includes 2 quizzes at the end to test understanding of:
1. NF4 quantization and its advantages
2. The combination of quantization and LoRA in QLoRA

## Files

- `dettmers-2023-qlora.m4a` - The audio podcast (15 min)
- `script.md` - Full transcript

## Regenerating

From the repository root:

```bash
cd python

# Production with ElevenLabs
export ELEVENLABS_API_KEY="your-api-key"
pixi run python generate.py ../public/dettmers-2023-qlora

# Normalize audio levels
pixi run python generate.py ../public/dettmers-2023-qlora --normalize
```

Requires `ffmpeg` for audio processing.
