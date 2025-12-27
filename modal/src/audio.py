"""
Audio processing utilities for Strollcast.

Provides functions for normalizing, concatenating, and analyzing audio using ffmpeg.
"""

import json
import subprocess
import tempfile
from pathlib import Path


def parse_loudnorm_stats(stderr: str) -> dict:
    """Parse loudnorm JSON output from ffmpeg stderr."""
    json_start = stderr.rfind("{")
    json_end = stderr.rfind("}") + 1
    if json_start != -1 and json_end > json_start:
        try:
            return json.loads(stderr[json_start:json_end])
        except json.JSONDecodeError:
            pass
    return {}


def normalize_audio(input_bytes: bytes, target_lufs: int = -16) -> bytes:
    """
    Normalize audio to target LUFS using two-pass loudnorm.

    Args:
        input_bytes: Raw MP3 audio bytes
        target_lufs: Target loudness in LUFS (default: -16 for podcasts)

    Returns:
        Normalized MP3 audio bytes
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = Path(tmpdir) / "input.mp3"
        output_path = Path(tmpdir) / "output.mp3"

        input_path.write_bytes(input_bytes)

        # Pass 1: Analyze loudness
        analyze_cmd = [
            "ffmpeg", "-i", str(input_path), "-af",
            f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json",
            "-f", "null", "-"
        ]
        result = subprocess.run(analyze_cmd, capture_output=True, text=True)
        stats = parse_loudnorm_stats(result.stderr)

        # Pass 2: Apply normalization
        if stats:
            # Two-pass with measured values (more accurate)
            af_filter = (
                f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:"
                f"measured_I={stats.get('input_i', '-24')}:"
                f"measured_TP={stats.get('input_tp', '-2')}:"
                f"measured_LRA={stats.get('input_lra', '7')}:"
                f"measured_thresh={stats.get('input_thresh', '-34')}:"
                f"offset={stats.get('target_offset', '0')}:linear=true"
            )
        else:
            # Fallback to single-pass
            af_filter = f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11"

        normalize_cmd = [
            "ffmpeg", "-y", "-i", str(input_path),
            "-af", af_filter,
            "-c:a", "libmp3lame", "-q:a", "2",
            str(output_path)
        ]
        subprocess.run(normalize_cmd, capture_output=True, check=True)

        return output_path.read_bytes()


def generate_silence(duration_ms: int = 500) -> bytes:
    """
    Generate silent audio.

    Args:
        duration_ms: Duration in milliseconds

    Returns:
        Silent MP3 audio bytes
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        output_path = Path(tmpdir) / "silence.mp3"

        cmd = [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", f"anullsrc=r=44100:cl=mono",
            "-t", str(duration_ms / 1000),
            "-c:a", "libmp3lame",
            str(output_path)
        ]
        subprocess.run(cmd, capture_output=True, check=True)

        return output_path.read_bytes()


def get_audio_duration(audio_bytes: bytes) -> float:
    """
    Get audio duration in seconds.

    Args:
        audio_bytes: Audio file bytes

    Returns:
        Duration in seconds
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = Path(tmpdir) / "input.mp3"
        input_path.write_bytes(audio_bytes)

        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(input_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        try:
            return float(result.stdout.strip())
        except (ValueError, AttributeError):
            return 0.0


def concatenate_segments(segments: list[bytes]) -> bytes:
    """
    Concatenate audio segments into a single M4A file.

    Args:
        segments: List of MP3 audio bytes

    Returns:
        Concatenated M4A audio bytes
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)

        # Write each segment to a file
        segment_files = []
        for i, segment in enumerate(segments):
            segment_path = tmpdir / f"segment_{i:04d}.mp3"
            segment_path.write_bytes(segment)
            segment_files.append(segment_path)

        # Create concat file list
        list_file = tmpdir / "filelist.txt"
        with open(list_file, "w") as f:
            for segment_path in segment_files:
                f.write(f"file '{segment_path}'\n")

        # Concatenate to M4A
        output_path = tmpdir / "output.m4a"
        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", str(list_file),
            "-c:a", "aac", "-b:a", "128k",
            str(output_path)
        ]
        subprocess.run(cmd, capture_output=True, check=True)

        return output_path.read_bytes()


def format_vtt_timestamp(seconds: float) -> str:
    """Format seconds as VTT timestamp (HH:MM:SS.mmm)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"


def generate_webvtt(segments_with_timing: list[dict]) -> str:
    """
    Generate WebVTT transcript content.

    Args:
        segments_with_timing: List of dicts with 'speaker', 'text', 'start', 'end'

    Returns:
        WebVTT formatted string
    """
    lines = ["WEBVTT", ""]

    cue_number = 1
    for segment in segments_with_timing:
        if segment["speaker"] == "PAUSE":
            continue

        start = format_vtt_timestamp(segment["start"])
        end = format_vtt_timestamp(segment["end"])
        speaker = segment["speaker"].capitalize()
        text = segment["text"]

        lines.append(str(cue_number))
        lines.append(f"{start} --> {end}")
        lines.append(f"<v {speaker}>{text}")
        lines.append("")

        cue_number += 1

    return "\n".join(lines)
