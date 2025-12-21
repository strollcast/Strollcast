# Strollcast

Listen to research papers while you stroll.

Strollcast transforms dense academic papers into engaging audio podcasts. Each episode features a conversational format with two hosts breaking down complex concepts into accessible explanations—perfect for walks, commutes, or any time you're on the move.

## Episodes

- **PyTorch FSDP: Experiences on Scaling Fully Sharded Data Parallel** (Zhao et al., 2023) - 24 min
- **ZeRO: Memory Optimizations Toward Training Trillion Parameter Models** (Rajbhandari et al., 2020) - 17 min

## Development

This is an [Astro](https://astro.build) static site.

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Generating Podcasts

Each episode folder in `public/` contains a `generate.py` script that uses ElevenLabs for text-to-speech:

```bash
export ELEVENLABS_API_KEY="your-api-key"
pip install elevenlabs
python public/<episode-folder>/generate.py
```

Requires `ffmpeg` for audio processing.

## Deployment

The site auto-deploys to GitHub Pages on push to `main` via GitHub Actions.

## License

MIT
