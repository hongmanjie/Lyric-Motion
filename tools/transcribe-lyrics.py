#!/usr/bin/env python3
"""Optional local speech-to-lyrics backend; invoked by lib/transcription.mjs."""
import argparse
import importlib.metadata
import json
import os
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="base")
    parser.add_argument("--language", default="auto")
    parser.add_argument("--model-cache", required=True)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    args = parser.parse_args()
    # Hugging Face can safely store ordinary cache files on Windows without
    # symlink privileges; no administrator or Developer Mode setup is needed.
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
    os.environ.setdefault("HF_HUB_DISABLE_IMPLICIT_TOKEN", "1")
    import numpy as np
    from faster_whisper import WhisperModel

    print("Decoding audio locally with FFmpeg…", file=sys.stderr, flush=True)
    # Pass samples instead of a filename: avoids PyAV codec/API changes and
    # supports user filenames containing Unicode and spaces without a shell.
    decoded = subprocess.run(
        [args.ffmpeg, "-v", "error", "-nostdin", "-i", args.audio,
         "-f", "f32le", "-ac", "1", "-ar", "16000", "pipe:1"],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    samples = np.frombuffer(decoded.stdout, dtype="<f4").copy()
    if not len(samples) or not np.isfinite(samples).all():
        raise ValueError("Decoded audio is empty or contains non-finite samples")
    duration = len(samples) / 16000
    print(f"Loading {args.model}; first use may download model weights…", file=sys.stderr, flush=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8", download_root=args.model_cache)
    segments, info = model.transcribe(
        samples, language=None if args.language == "auto" else args.language,
        beam_size=5, word_timestamps=True, vad_filter=False,
        condition_on_previous_text=False, temperature=0,
    )
    output = []
    adjustments = []
    for segment in segments:
        start, end = float(segment.start), float(segment.end)
        if start >= duration:
            adjustments.append({"segment": segment.id, "action": "discarded-after-audio"})
            continue
        if end > duration:
            adjustments.append({"segment": segment.id, "action": "clipped-to-decoded-duration", "originalEnd": end})
        words = []
        for word in segment.words or []:
            ws, we = float(word.start), float(word.end)
            if ws >= duration:
                continue
            words.append({"start": max(0, ws), "end": min(duration, we),
                          "text": word.word, "probability": float(word.probability)})
        output.append({"start": max(0, start), "end": min(duration, end),
                       "text": segment.text, "words": words,
                       "avgLogprob": float(segment.avg_logprob),
                       "noSpeechProbability": float(segment.no_speech_prob),
                       "compressionRatio": float(segment.compression_ratio)})
        print(f"Transcribed {min(duration, end):.1f} / {duration:.1f} s", file=sys.stderr, flush=True)
    result = {
        "schemaVersion": 1, "backend": "faster-whisper",
        "backendVersion": importlib.metadata.version("faster-whisper"),
        "model": args.model, "language": info.language,
        "languageProbability": float(info.language_probability),
        "decodedDuration": duration, "device": "cpu", "computeType": "int8",
        "wordTimingMethod": "whisper-cross-attention-estimate",
        "adjustments": adjustments, "segments": output,
    }
    # The Node caller supplies a fresh staging directory. Never overwrite.
    with open(args.output, "x", encoding="utf-8", newline="\n") as stream:
        json.dump(result, stream, ensure_ascii=False, allow_nan=False, indent=2)
        stream.write("\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Local transcription failed: {error}", file=sys.stderr, flush=True)
        if isinstance(error, subprocess.CalledProcessError) and error.stderr:
            print(error.stderr.decode("utf-8", errors="replace")[-3000:], file=sys.stderr, flush=True)
        sys.exit(1)
