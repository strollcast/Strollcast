#!/usr/bin/env python3
"""
Migrate local cache to Cloudflare R2 with normalization.

This script:
1. Parses all episode scripts to map text → old cache key
2. Normalizes each cached segment (2-pass loudnorm to -16 LUFS)
3. Uploads normalized audio to R2 with new cache key

Prerequisites:
    pip install boto3

Environment variables required:
    R2_ENDPOINT          - e.g., https://<account_id>.r2.cloudflarestorage.com
    R2_ACCESS_KEY_ID     - R2 API token access key
    R2_SECRET_ACCESS_KEY - R2 API token secret
    R2_BUCKET            - Bucket name (default: strollcast-cache)

Usage:
    # Dry run (no upload, just show what would be migrated)
    python migrate_cache_to_r2.py --dry-run

    # Migrate all cached segments
    python migrate_cache_to_r2.py

    # Migrate specific episode only
    python migrate_cache_to_r2.py --episode zhao-2023-pytorch-fsdp
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Voice IDs (must match generate.py)
ELEVENLABS_ERIC_VOICE = "gP8LZQ3GGokV0MP5JYjg"
ELEVENLABS_MAYA_VOICE = "21m00Tcm4TlvDq8ikWAM"
MODEL_ID = "eleven_turbo_v2_5"

# Paths
SCRIPT_DIR = Path(__file__).parent
CACHE_DIR = SCRIPT_DIR / ".cache"
PUBLIC_DIR = SCRIPT_DIR.parent / "public"


def get_old_cache_key(text: str, voice_id: str) -> str:
    """Compute cache key matching the old format (unnormalized)."""
    cache_data = json.dumps({
        "text": text,
        "voice_id": voice_id,
        "model_id": MODEL_ID,
        "stability": 0.5,
        "similarity_boost": 0.75,
        "style": 0.0,
    }, sort_keys=True)
    return hashlib.sha256(cache_data.encode()).hexdigest()


def get_new_cache_key(text: str, voice_id: str) -> str:
    """Compute cache key for new format (normalized)."""
    cache_data = json.dumps({
        "text": text,
        "voice_id": voice_id,
        "model_id": MODEL_ID,
        "stability": 0.5,
        "similarity_boost": 0.75,
        "style": 0.0,
        "normalized": True,
        "lufs": -16,
    }, sort_keys=True)
    return hashlib.sha256(cache_data.encode()).hexdigest()


def parse_podcast_script(filepath: Path) -> list[dict]:
    """Parse podcast script and extract speaker segments."""
    with open(filepath, 'r') as f:
        content = f.read()

    segments = []
    for line in content.split('\n'):
        line = line.strip()
        if not line:
            continue

        speaker_match = re.match(r'\*\*([A-Z]+):\*\*\s*(.*)', line)
        if speaker_match:
            speaker = speaker_match.group(1)
            text = speaker_match.group(2)

            # Clean up markdown
            text = re.sub(r'\*\*\[.*?\]\*\*', '', text)
            text = re.sub(r'\[.*?\]', '', text)
            text = text.replace('**', '').replace('*', '').strip()

            if text and speaker in ['ERIC', 'MAYA']:
                segments.append({'speaker': speaker, 'text': text})

    return segments


def parse_loudnorm_stats(stderr: str) -> dict:
    """Parse loudnorm JSON output from ffmpeg stderr."""
    json_start = stderr.rfind('{')
    json_end = stderr.rfind('}') + 1
    if json_start != -1 and json_end > json_start:
        try:
            return json.loads(stderr[json_start:json_end])
        except json.JSONDecodeError:
            pass
    return {}


def normalize_audio(input_path: Path, output_path: Path) -> bool:
    """Two-pass loudnorm to -16 LUFS."""
    # Pass 1: Analyze
    analyze_cmd = [
        "ffmpeg", "-i", str(input_path), "-af",
        "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
        "-f", "null", "-"
    ]
    result = subprocess.run(analyze_cmd, capture_output=True, text=True)
    stats = parse_loudnorm_stats(result.stderr)

    if not stats:
        # Fallback to single-pass
        cmd = [
            "ffmpeg", "-y", "-i", str(input_path), "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-c:a", "libmp3lame", "-q:a", "2",
            str(output_path)
        ]
    else:
        # Two-pass with measured values
        cmd = [
            "ffmpeg", "-y", "-i", str(input_path), "-af",
            f"loudnorm=I=-16:TP=-1.5:LRA=11:"
            f"measured_I={stats.get('input_i', '-24')}:"
            f"measured_TP={stats.get('input_tp', '-2')}:"
            f"measured_LRA={stats.get('input_lra', '7')}:"
            f"measured_thresh={stats.get('input_thresh', '-34')}:"
            f"offset={stats.get('target_offset', '0')}:linear=true",
            "-c:a", "libmp3lame", "-q:a", "2",
            str(output_path)
        ]

    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0


def build_segment_mapping(episode_filter: str = None) -> dict:
    """
    Build mapping of old_cache_key → (new_cache_key, episode, speaker, text_preview).
    """
    mapping = {}

    episode_dirs = sorted(PUBLIC_DIR.glob("*/"))
    for episode_dir in episode_dirs:
        if episode_dir.name == "api":
            continue

        if episode_filter and episode_dir.name != episode_filter:
            continue

        script_path = episode_dir / "script.md"
        if not script_path.exists():
            continue

        segments = parse_podcast_script(script_path)
        for seg in segments:
            voice_id = ELEVENLABS_ERIC_VOICE if seg['speaker'] == 'ERIC' else ELEVENLABS_MAYA_VOICE
            old_key = get_old_cache_key(seg['text'], voice_id)
            new_key = get_new_cache_key(seg['text'], voice_id)

            mapping[old_key] = {
                'new_key': new_key,
                'episode': episode_dir.name,
                'speaker': seg['speaker'],
                'text_preview': seg['text'][:50] + ('...' if len(seg['text']) > 50 else ''),
            }

    return mapping


def upload_to_r2(r2_client, bucket: str, key: str, data: bytes, dry_run: bool = False) -> bool:
    """Upload data to R2."""
    if dry_run:
        return True

    try:
        r2_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=data,
            ContentType="audio/mpeg"
        )
        return True
    except Exception as e:
        print(f"      Error uploading {key}: {e}")
        return False


def migrate_segment(
    old_key: str,
    info: dict,
    r2_client,
    bucket: str,
    dry_run: bool = False
) -> dict:
    """Migrate a single segment: normalize and upload."""
    old_path = CACHE_DIR / f"{old_key}.mp3"
    result = {
        'old_key': old_key,
        'new_key': info['new_key'],
        'episode': info['episode'],
        'success': False,
        'skipped': False,
        'error': None,
    }

    if not old_path.exists():
        result['skipped'] = True
        result['error'] = 'Not in local cache'
        return result

    if dry_run:
        result['success'] = True
        return result

    # Normalize to temp file
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
        tmp_path = Path(tmp.name)

    try:
        if not normalize_audio(old_path, tmp_path):
            result['error'] = 'Normalization failed'
            return result

        # Read normalized audio
        with open(tmp_path, 'rb') as f:
            normalized_data = f.read()

        # Upload to R2
        r2_key = f"segments/{info['new_key']}.mp3"
        if upload_to_r2(r2_client, bucket, r2_key, normalized_data):
            result['success'] = True
        else:
            result['error'] = 'Upload failed'

    finally:
        if tmp_path.exists():
            tmp_path.unlink()

    return result


def main():
    parser = argparse.ArgumentParser(
        description='Migrate local cache to R2 with normalization'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be migrated without uploading'
    )
    parser.add_argument(
        '--episode',
        help='Only migrate segments from this episode'
    )
    parser.add_argument(
        '--workers',
        type=int,
        default=4,
        help='Number of parallel workers (default: 4)'
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Cache Migration: Local → R2 (with normalization)")
    print("=" * 60)

    # Check R2 credentials
    if not args.dry_run:
        required_vars = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
        missing = [v for v in required_vars if not os.environ.get(v)]
        if missing:
            print(f"\nError: Missing environment variables: {', '.join(missing)}")
            print("\nRequired:")
            print("  R2_ENDPOINT          - https://<account_id>.r2.cloudflarestorage.com")
            print("  R2_ACCESS_KEY_ID     - R2 API token access key")
            print("  R2_SECRET_ACCESS_KEY - R2 API token secret")
            return 1

        import boto3
        r2_client = boto3.client(
            's3',
            endpoint_url=os.environ['R2_ENDPOINT'],
            aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
        )
        bucket = os.environ.get('R2_BUCKET', 'strollcast-cache')
    else:
        r2_client = None
        bucket = 'strollcast-cache'
        print("\n[DRY RUN MODE - No uploads will be performed]")

    # Build mapping from scripts
    print("\n[1/3] Parsing episode scripts...")
    mapping = build_segment_mapping(args.episode)
    print(f"      Found {len(mapping)} segments in scripts")

    # Check which are in local cache
    cached_keys = {p.stem for p in CACHE_DIR.glob("*.mp3")}
    to_migrate = {k: v for k, v in mapping.items() if k in cached_keys}
    print(f"      {len(to_migrate)} segments found in local cache")

    if not to_migrate:
        print("\n      Nothing to migrate!")
        return 0

    # Group by episode for display
    by_episode = {}
    for key, info in to_migrate.items():
        ep = info['episode']
        by_episode.setdefault(ep, []).append(key)

    print("\n      Segments per episode:")
    for ep, keys in sorted(by_episode.items()):
        print(f"        {ep}: {len(keys)}")

    # Migrate segments
    print(f"\n[2/3] Normalizing and uploading ({args.workers} workers)...")

    results = {'success': 0, 'failed': 0, 'skipped': 0}
    total = len(to_migrate)

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(
                migrate_segment,
                old_key,
                info,
                r2_client,
                bucket,
                args.dry_run
            ): old_key
            for old_key, info in to_migrate.items()
        }

        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()

            if result['success']:
                results['success'] += 1
            elif result['skipped']:
                results['skipped'] += 1
            else:
                results['failed'] += 1
                print(f"\n      Failed: {result['episode']} - {result['error']}")

            # Progress
            pct = i * 100 // total
            bar = '#' * (pct // 5) + '-' * (20 - pct // 5)
            print(f"\r      [{bar}] {pct}% ({i}/{total})", end='', flush=True)

    print()

    # Summary
    print("\n[3/3] Migration complete!")
    print("=" * 60)
    print(f"      Migrated: {results['success']}")
    print(f"      Failed:   {results['failed']}")
    print(f"      Skipped:  {results['skipped']}")

    if args.dry_run:
        print("\n[DRY RUN] No files were uploaded. Run without --dry-run to migrate.")

    return 0 if results['failed'] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
