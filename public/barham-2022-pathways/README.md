# Pathways: Asynchronous Distributed Dataflow for ML

**Authors:** Paul Barham, Aakanksha Chowdhery, Jeff Dean, Sanjay Ghemawat, Steven Hand, Dan Hurt, Michael Isard, Hyeontaek Lim, Ruoming Pang, Sudip Roy, Brennan Saeta, Parker Schuh, Ryan Sepassi, Laurent El Shafey, Chandramohan A. Thekkath, Yonghui Wu (Google)
**Year:** 2022
**Venue:** MLSys 2022
**Paper:** https://arxiv.org/abs/2203.12533

## Summary

This podcast episode covers Google's Pathways paper, which introduces a new orchestration layer for accelerators designed to enable flexible, heterogeneous distributed computation. Pathways uses asynchronous dataflow with futures to separate the control plane from the data plane, achieving near-optimal performance while supporting complex parallelism patterns.

## Topics Covered

- The infrastructure landscape: multi-controller vs single-controller
- Control plane vs data plane separation
- Futures and asynchronous execution
- Buffered dispatch for hiding scheduling latency
- Gang scheduling for SPMD computations
- Resource management across TPU pods and islands
- Pipeline parallelism implementation
- Multi-island training across data centers
- Performance results: ~100% utilization on 2048 TPUs
- Comparison with Megatron, DeepSpeed, and other systems
- The vision for sparsely activated and multi-modal models

## Files

- `barham-2022-pathways.m4a` - The audio podcast (29 min)
- `script.md` - Full transcript

## Regenerating

From the repository root:

```bash
cd python

# Preview with macOS TTS (free, fast)
pixi run python generate.py ../public/barham-2022-pathways --preview

# Production with ElevenLabs
export ELEVENLABS_API_KEY="your-api-key"
pixi run python generate.py ../public/barham-2022-pathways
```

Requires `ffmpeg` for audio processing.
