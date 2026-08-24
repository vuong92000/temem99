#!/usr/bin/env python3
"""Generate a multi-clip episode via the running Agnes Video Generator server.

Each clip in the episode JSON is submitted as an independent `simple` t2v task so the
clip prompts are sent to the video model *verbatim* (creative mode would rewrite them
with its own screenwriter). The shared world-bible is prepended to every clip prompt so
character identity stays stable across shots, and the shared negative prompt is attached
to each task.

Usage:
    python episodes/run_episode.py episodes/ep02_rooftop_breakfast.json
    python episodes/run_episode.py <spec.json> --dry-run     # print payloads, submit nothing
    python episodes/run_episode.py <spec.json> --clips 3,5   # only re-run clips 3 and 5
    python episodes/run_episode.py <spec.json> --concat-only # stitch already-finished clips

Env:
    SERVER   base URL of the running server (default http://127.0.0.1:8765)
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

SERVER = os.environ.get("SERVER", "http://127.0.0.1:8765").rstrip("/")
POLL_SECONDS = 10
# A 5s clip typically needs a few minutes end-to-end; fail loudly rather than hang forever.
CLIP_TIMEOUT_SECONDS = 45 * 60

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)


# ── HTTP helpers (stdlib only, so this runs with no extra deps) ──────────────


def _post_form(path: str, fields: dict) -> dict:
    """POST application/x-www-form-urlencoded — matches the server's Form(...) params."""
    data = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(SERVER + path, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise SystemExit(f"POST {path} failed [{e.code}]: {body}")
    except urllib.error.URLError as e:
        raise SystemExit(f"Cannot reach server at {SERVER}: {e.reason}\n"
                         f"Start it with:  .venv/bin/python server.py")


def _get(path: str) -> dict:
    req = urllib.request.Request(SERVER + path)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"_http_error": e.code, "_body": e.read().decode(errors="replace")}


# ── preflight ───────────────────────────────────────────────────────────────


def preflight() -> None:
    """Fail fast with an actionable message instead of letting tasks hang in retry."""
    cfg = _get("/api/config/keys")
    if cfg.get("_http_error") or not cfg.get("key_count"):
        raise SystemExit(
            "No API key configured.\n"
            "  Add one in the web UI settings page, or set AGNES_API_KEY in .env and restart.\n"
            "  Free key: https://platform.agnes-ai.com"
        )
    print(f"[preflight] API key(s) configured: {cfg['key_count']} ({cfg.get('source')})")


def build_prompt(spec: dict, clip: dict) -> str:
    """World bible + clip prompt. Keeps identity stable across independent clips."""
    return f"{spec['world_bible']}\n\n{clip['prompt']}"


# ── submit / poll ───────────────────────────────────────────────────────────


def submit_clip(spec: dict, clip: dict) -> str:
    fields = {
        "prompt": build_prompt(spec, clip),
        "mode": spec.get("mode", "t2v"),
        "duration": clip.get("duration", 5),
        "video_width": spec.get("video_width", 768),
        "video_height": spec.get("video_height", 1152),
        "negative_prompt": spec["negative_prompt"],
    }
    if spec.get("seed") is not None:
        # Offset per clip: same seed for every shot tends to produce near-identical framing.
        fields["seed"] = int(spec["seed"]) + clip["n"]
    out = _post_form("/api/tasks/simple", fields)
    task_id = out["task_id"]
    print(f"[clip {clip['n']}] submitted {task_id}  ({clip['title']})")
    return task_id


def wait_for(task_id: str, label: str) -> dict:
    started = time.time()
    last_msg = None
    while True:
        st = _get(f"/api/tasks/{task_id}")
        if st.get("_http_error"):
            raise SystemExit(f"{label}: task {task_id} not found ({st['_http_error']})")
        status = st.get("status")
        msg = st.get("current_message") or st.get("current_step")
        if msg != last_msg:
            print(f"  {label}: [{status}] {msg}")
            last_msg = msg
        if status in ("completed", "success", "done"):
            return st
        if status in ("failed", "error", "cancelled", "stopped"):
            raise SystemExit(f"{label}: task ended as {status} — {st.get('error') or msg}")
        if time.time() - started > CLIP_TIMEOUT_SECONDS:
            raise SystemExit(f"{label}: timed out after {CLIP_TIMEOUT_SECONDS}s (last: {msg})")
        time.sleep(POLL_SECONDS)


def clip_video_path(state: dict) -> str | None:
    """Resolve the finished clip's mp4 on disk from the task state."""
    for key in ("final_video_file", "final_video", "video_file"):
        p = state.get(key)
        if p:
            return p if os.path.isabs(p) else os.path.join(REPO, p)
    return None


# ── concat ──────────────────────────────────────────────────────────────────


def ffmpeg_bin() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def concat(paths: list[str], out_path: str) -> str:
    """Stream-copy concat (no re-encode): all clips share codec/resolution."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    list_file = out_path + ".txt"
    with open(list_file, "w") as f:
        for p in paths:
            f.write(f"file '{os.path.abspath(p)}'\n")
    cmd = [ffmpeg_bin(), "-y", "-f", "concat", "-safe", "0", "-i", list_file,
           "-c", "copy", out_path]
    print(f"[concat] {len(paths)} clips -> {out_path}")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        # Fall back to re-encode if stream copy rejects mismatched params.
        print("[concat] stream copy failed, re-encoding...")
        cmd = [ffmpeg_bin(), "-y", "-f", "concat", "-safe", "0", "-i", list_file,
               "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
               out_path]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            raise SystemExit(f"ffmpeg concat failed:\n{r.stderr[-2000:]}")
    os.remove(list_file)
    return out_path


# ── main ────────────────────────────────────────────────────────────────────


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("spec", help="episode JSON spec")
    ap.add_argument("--dry-run", action="store_true", help="print payloads, submit nothing")
    ap.add_argument("--clips", default="", help="comma-separated clip numbers to run (default all)")
    ap.add_argument("--concat-only", action="store_true", help="stitch clips listed in the state file")
    ap.add_argument("--out", default="", help="output mp4 path")
    args = ap.parse_args()

    with open(args.spec) as f:
        spec = json.load(f)

    clips = spec["clips"]
    if args.clips:
        want = {int(x) for x in args.clips.split(",")}
        clips = [c for c in clips if c["n"] in want]

    ep = spec["episode"]
    out_path = args.out or os.path.join(REPO, "output", f"episode_{ep}.mp4")
    state_path = os.path.join(HERE, f".state_ep{ep}.json")

    if args.dry_run:
        for c in clips:
            print("=" * 70)
            print(f"CLIP {c['n']} — {c['title']}  ({c['duration']}s)")
            print("=" * 70)
            print(build_prompt(spec, c))
            print(f"\n[negative] {spec['negative_prompt'][:120]}...")
            seed = spec.get("seed")
            print(f"[seed] {seed + c['n'] if seed is not None else 'random'}\n")
        print(f"{len(clips)} clips would be submitted to {SERVER}/api/tasks/simple")
        return

    done: dict[str, str] = {}
    if os.path.exists(state_path):
        done = json.load(open(state_path))

    if not args.concat_only:
        preflight()
        for c in clips:
            task_id = submit_clip(spec, c)
            state = wait_for(task_id, f"clip {c['n']}")
            path = clip_video_path(state)
            if not path or not os.path.exists(path):
                raise SystemExit(f"clip {c['n']}: finished but no video file found in state")
            done[str(c["n"])] = path
            json.dump(done, open(state_path, "w"), indent=2)
            print(f"[clip {c['n']}] done -> {path}")

    ordered = [done[str(c["n"])] for c in spec["clips"] if str(c["n"]) in done]
    if len(ordered) < len(spec["clips"]):
        missing = [c["n"] for c in spec["clips"] if str(c["n"]) not in done]
        print(f"[warn] clips not yet generated: {missing} — concatenating {len(ordered)} available")
    if not ordered:
        raise SystemExit("nothing to concatenate")
    concat(ordered, out_path)
    print(f"\n✅ Episode {ep} — {spec['title']}\n   {out_path}")


if __name__ == "__main__":
    main()
