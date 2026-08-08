from __future__ import annotations

import math
import subprocess
import sys
import wave
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "campaign-1"
OUT.mkdir(parents=True, exist_ok=True)

SOURCE_IMAGES = [
    Path(r"C:\Users\takue\.codex\generated_images\019fc3db-6f9f-7683-88b3-1ad568e148e3\exec-5629722f-9602-47e1-b3af-fb7f671eb55e.png"),
    Path(r"C:\Users\takue\.codex\generated_images\019fc3db-6f9f-7683-88b3-1ad568e148e3\exec-3b8bd7dc-b05f-40af-811a-5b4947304a60.png"),
    Path(r"C:\Users\takue\.codex\generated_images\019fc3db-6f9f-7683-88b3-1ad568e148e3\exec-5f03294c-9835-4337-b8de-9971e5410ad7.png"),
]

W, H = 720, 1280
FPS = 30
DURATION = 12.0
PURPLE = (48, 3, 73)
VIOLET = (111, 38, 239)
LIME = (177, 249, 55)


@lru_cache(maxsize=None)
def load_font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    path = ROOT / f"node_modules/@expo-google-fonts/archivo/{weight}/Archivo_{weight}.ttf"
    return ImageFont.truetype(str(path), size)


BIG = load_font("900Black", 86)
HUGE = load_font("900Black", 104)
MEDIUM = load_font("700Bold", 31)
SMALL = load_font("700Bold", 23)


def fit_headline(draw: ImageDraw.ImageDraw, text: str, max_width: int, max_size: int):
    for size in range(max_size, 47, -2):
        candidate = load_font("900Black", size)
        lines = text.splitlines() or [text]
        if max(draw.textbbox((0, 0), line, font=candidate)[2] for line in lines) <= max_width:
            return candidate
    return load_font("900Black", 48)


def ease(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3.0 - 2.0 * x)


def cover(img: Image.Image, scale: float = 1.0, focus_y: float = 0.5) -> Image.Image:
    iw, ih = img.size
    base = max(W / iw, H / ih) * scale
    nw, nh = int(iw * base), int(ih * base)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - W) // 2
    top = int((nh - H) * max(0.0, min(1.0, focus_y)))
    return resized.crop((left, top, left + W, top + H))


def grade(img: Image.Image, brightness: float = 1.0, saturation: float = 1.0) -> Image.Image:
    img = ImageEnhance.Color(img).enhance(saturation)
    img = ImageEnhance.Contrast(img).enhance(1.06)
    return ImageEnhance.Brightness(img).enhance(brightness)


def add_vignette(img: Image.Image, strength: float = 0.36) -> Image.Image:
    yy, xx = np.ogrid[-1:1:H * 1j, -1:1:W * 1j]
    radius = np.sqrt(xx * xx + yy * yy)
    mask = np.clip(1.0 - strength * np.maximum(0, radius - 0.22), 0.52, 1.0)
    arr = np.asarray(img, dtype=np.float32)
    arr *= mask[..., None]
    return Image.fromarray(np.uint8(np.clip(arr, 0, 255)))


def flash(frame: Image.Image, amount: float) -> Image.Image:
    if amount <= 0:
        return frame
    white = Image.new("RGB", frame.size, (245, 240, 255))
    return Image.blend(frame, white, min(1.0, amount))


def add_copy(
    frame: Image.Image,
    headline: str,
    kicker: str = "",
    *,
    top: int = 760,
    foreground: tuple[int, int, int] = (255, 255, 255),
) -> Image.Image:
    canvas = frame.convert("RGBA")
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, top - 72, W, H), fill=(20, 4, 31, 176))
    od.rectangle((0, top - 72, 13, H), fill=LIME + (255,))
    canvas = Image.alpha_composite(canvas, overlay)
    draw = ImageDraw.Draw(canvas)
    headline_font = fit_headline(draw, headline, W - 96, 86)
    draw.text((48, top), headline, font=headline_font, fill=foreground, spacing=-4)
    if kicker:
        box = draw.multiline_textbbox((0, 0), headline, font=headline_font, spacing=-4)
        kicker_y = top + (box[3] - box[1]) + 30
        draw.rounded_rectangle((48, kicker_y, W - 48, kicker_y + 58), radius=20, fill=LIME + (255,))
        draw.text((72, kicker_y + 13), kicker, font=SMALL, fill=PURPLE + (255,))
    return canvas.convert("RGB")


def draw_brand_frame(pulse: float) -> Image.Image:
    frame = Image.new("RGB", (W, H), (9, 6, 13))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = W // 2, H // 2
    glow_r = int(205 + 15 * pulse)
    gd.ellipse((cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r), fill=(111, 38, 239, 55))
    glow = glow.filter(ImageFilter.GaussianBlur(55))
    frame = Image.alpha_composite(frame.convert("RGBA"), glow)

    draw = ImageDraw.Draw(frame)
    size = int(190 + 8 * pulse)
    box = (cx - size // 2, 236 - size // 2, cx + size // 2, 236 + size // 2)
    draw.rounded_rectangle(box, radius=58, fill=VIOLET + (255,), outline=LIME + (255,), width=10)
    try:
        font = ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf", 150)
    except OSError:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), "F", font=font)
    tx = cx - (bbox[2] - bbox[0]) // 2
    ty = 236 - (bbox[3] - bbox[1]) // 2 - bbox[1]
    draw.text((tx, ty), "F", font=font, fill=(255, 255, 255, 255))
    title = "GRASSROOTS"
    title_font = fit_headline(draw, title, W - 64, 104)
    title_box = draw.textbbox((0, 0), title, font=title_font)
    draw.text(((W - (title_box[2] - title_box[0])) / 2, 390), title, font=title_font, fill=(255, 255, 255, 255))
    strap = "FOOTBALL STARTS HERE"
    strap_box = draw.textbbox((0, 0), strap, font=MEDIUM)
    draw.text(((W - (strap_box[2] - strap_box[0])) / 2, 525), strap, font=MEDIUM, fill=LIME + (255,))
    draw.rounded_rectangle((58, 1024, W - 58, 1110), radius=28, fill=LIME + (255,))
    url = "alone-grassroots.pages.dev"
    url_box = draw.textbbox((0, 0), url, font=MEDIUM)
    draw.text(((W - (url_box[2] - url_box[0])) / 2, 1048), url, font=MEDIUM, fill=PURPLE + (255,))
    return frame.convert("RGB")


def make_frame(t: float, images: list[Image.Image]) -> Image.Image:
    # Beat 1: the 8-0 mismatch.
    if t < 2.75:
        p = t / 2.75
        frame = cover(images[0], 1.0 + 0.045 * ease(p), focus_y=0.42)
        frame = grade(frame, 0.92, 1.08)
        if t < 0.18:
            frame = flash(frame, 1.0 - t / 0.18)
        return add_copy(add_vignette(frame), "BAD MATCHUPS\nKILL THE GAME.", "8–0 SHOULD NOT BE THE PLAN", top=760)

    # A fast purple wipe carries us to the next weekend.
    if t < 3.02:
        p = (t - 2.75) / 0.27
        old = cover(images[0], 1.05, focus_y=0.42)
        new = cover(images[1], 1.0, focus_y=0.46)
        frame = Image.blend(old, new, ease(p))
        overlay = Image.new("RGB", (W, H), VIOLET)
        frame = Image.blend(frame, overlay, 0.38 * math.sin(math.pi * p))
        return frame

    # Beat 2: same teams, now 6-0.
    if t < 5.7:
        p = (t - 3.02) / 2.68
        # A very small sideways drift makes the still feel like camera footage.
        base = cover(images[1], 1.025 + 0.035 * ease(p), focus_y=0.46)
        frame = grade(base, 0.94, 1.12)
        return add_copy(add_vignette(frame, 0.42), "SAME TEAMS.\nSAME RESULT.", "WEEK AFTER WEEK", top=782)

    # Visual reset: silence/black followed by a lime pulse.
    if t < 6.25:
        frame = Image.new("RGB", (W, H), (4, 3, 6))
        if t > 6.08:
            a = ease((t - 6.08) / 0.17)
            frame = Image.blend(frame, Image.new("RGB", (W, H), LIME), 0.18 * a)
        draw = ImageDraw.Draw(frame)
        line_one = "THERE IS A"
        line_two = "BETTER WAY."
        box_one = draw.textbbox((0, 0), line_one, font=BIG)
        box_two = draw.textbbox((0, 0), line_two, font=HUGE)
        draw.text(((W - (box_one[2] - box_one[0])) / 2, 470), line_one, font=BIG, fill=(255, 255, 255))
        draw.text(((W - (box_two[2] - box_two[0])) / 2, 575), line_two, font=HUGE, fill=LIME)
        return frame

    # Reveal: many nearby opponents.
    if t < 9.85:
        p = (t - 6.25) / 3.6
        frame = cover(images[2], 1.11 - 0.11 * ease(p), focus_y=0.52)
        frame = grade(frame, 0.97 + 0.07 * ease(p), 1.16)
        if t < 6.55:
            frame = flash(frame, 0.5 * (1.0 - (t - 6.25) / 0.30))
        return add_copy(
            add_vignette(frame, 0.23),
            "FIND TEAMS\nNEAR YOU.",
            "LOCATION • AVAILABILITY • LEVEL",
            top=770,
        )

    # Fade the turf to the brand mark, alone.
    if t < 10.35:
        p = ease((t - 9.85) / 0.5)
        src = cover(images[2], 1.0, focus_y=0.52)
        return Image.blend(src, Image.new("RGB", (W, H), (9, 6, 13)), p)

    return draw_brand_frame(math.sin((t - 10.35) * math.pi * 2.0) * 0.5 + 0.5)


def make_music(path: Path) -> None:
    sr = 48_000
    n = int(DURATION * sr)
    t = np.arange(n, dtype=np.float64) / sr
    music = np.zeros(n, dtype=np.float64)
    rng = np.random.default_rng(20260802)

    # Original 120 BPM afro-electronic pulse: percussion, bass, and glassy chords.
    bpm = 120.0
    beat = 60.0 / bpm
    for k in range(int(DURATION / beat) + 2):
        start = k * beat
        idx = (t >= start) & (t < start + 0.20)
        tt = t[idx] - start
        kick = np.sin(2 * np.pi * (75 - 35 * tt / 0.20) * tt) * np.exp(-tt * 22)
        music[idx] += 0.72 * kick
        if k % 2 == 1:
            idx2 = (t >= start) & (t < start + 0.14)
            tt2 = t[idx2] - start
            clap = rng.normal(0, 1, tt2.size) * np.exp(-tt2 * 35)
            music[idx2] += 0.18 * clap

    # Sixteenth-note shakers, reduced during the black reset.
    for k in range(int(DURATION / (beat / 4)) + 1):
        start = k * beat / 4
        idx = (t >= start) & (t < start + 0.045)
        tt = t[idx] - start
        shaker = rng.normal(0, 1, tt.size) * np.exp(-tt * 75)
        music[idx] += (0.052 if k % 2 else 0.075) * shaker

    notes = [55.0, 65.41, 73.42, 49.0]
    for bar in range(6):
        start = bar * 2.0
        freq = notes[bar % len(notes)]
        idx = (t >= start) & (t < min(DURATION, start + 1.75))
        tt = t[idx] - start
        bass = np.sin(2 * np.pi * freq * tt) + 0.22 * np.sin(2 * np.pi * 2 * freq * tt)
        music[idx] += 0.17 * bass * np.exp(-tt * 0.48)

    # Score impacts and the reveal riser.
    for start in (0.02, 2.78, 5.72):
        idx = (t >= start) & (t < start + 0.32)
        tt = t[idx] - start
        music[idx] += 0.24 * rng.normal(0, 1, tt.size) * np.exp(-tt * 16)
    idx = (t >= 5.7) & (t < 6.35)
    tt = t[idx] - 5.7
    music[idx] *= np.linspace(0.2, 0.0, idx.sum())
    riser = np.sin(2 * np.pi * (320 + 900 * tt * tt) * tt) * np.linspace(0.0, 0.28, idx.sum())
    music[idx] += riser
    idx = (t >= 6.25) & (t < 6.75)
    tt = t[idx] - 6.25
    music[idx] += 0.28 * np.sin(2 * np.pi * 880 * tt) * np.exp(-tt * 7)

    fade = np.ones(n)
    fade[: int(0.08 * sr)] = np.linspace(0, 1, int(0.08 * sr))
    fade[-int(0.7 * sr) :] = np.linspace(1, 0, int(0.7 * sr))
    music *= fade
    music = np.tanh(music * 1.25)
    stereo = np.stack([music, music], axis=1)
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())


def main() -> None:
    missing = [p for p in SOURCE_IMAGES if not p.exists()]
    if missing:
        raise FileNotFoundError(f"Missing generated source image(s): {missing}")

    images = [Image.open(p).convert("RGB") for p in SOURCE_IMAGES]
    sys.path.insert(0, str(ROOT / ".video-deps"))
    import imageio_ffmpeg

    silent = OUT / "campaign-1-silent.mp4"
    music = OUT / "campaign-1-original-music.wav"
    final = OUT / "grassroots-big-words-ad.mp4"
    preview = OUT / "grassroots-big-words-ad-preview.jpg"

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    proc = subprocess.Popen(
        [
            ffmpeg,
            "-y",
            "-f",
            "rawvideo",
            "-vcodec",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "-s",
            f"{W}x{H}",
            "-r",
            str(FPS),
            "-i",
            "-",
            "-an",
            "-vcodec",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(silent),
        ],
        stdin=subprocess.PIPE,
    )
    assert proc.stdin is not None
    for i in range(int(DURATION * FPS)):
        frame = make_frame(i / FPS, images)
        proc.stdin.write(np.asarray(frame, dtype=np.uint8).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError("Video encoding failed")

    make_music(music)
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(silent),
            "-i",
            str(music),
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(final),
        ],
        check=True,
    )

    make_frame(7.9, images).save(preview, quality=92)
    silent.unlink(missing_ok=True)
    print(final)
    print(music)
    print(preview)


if __name__ == "__main__":
    main()
