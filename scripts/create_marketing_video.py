from __future__ import annotations

import argparse
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


WIDTH = 720
HEIGHT = 1280
FPS = 20
PURPLE = (45, 15, 66)
PURPLE_SOFT = (108, 43, 234)
LIME = (185, 243, 74)
WHITE = (255, 255, 255)


def font(path: Path, size: int):
    return ImageFont.truetype(str(path), size=size)


def cover(image: Image.Image, width: int, height: int, zoom: float, pan: float):
    image = image.convert("RGB")
    scale = max(width / image.width, height / image.height) * zoom
    resized = image.resize(
        (math.ceil(image.width * scale), math.ceil(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    max_x = max(0, resized.width - width)
    max_y = max(0, resized.height - height)
    x = int(max_x * min(1, max(0, pan)))
    y = int(max_y * 0.5)
    return resized.crop((x, y, x + width, y + height))


def prepare_cover(image: Image.Image):
    image = image.convert("RGB")
    scale = max(WIDTH / image.width, HEIGHT / image.height) * 1.12
    return image.resize(
        (math.ceil(image.width * scale), math.ceil(image.height * scale)),
        Image.Resampling.LANCZOS,
    )


SHADE = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
_shade_draw = ImageDraw.Draw(SHADE)
for _y in range(HEIGHT):
    _alpha = int(12 + 178 * max(0, (_y / HEIGHT - 0.42) / 0.58))
    _shade_draw.line((0, _y, WIDTH, _y), fill=(28, 7, 42, _alpha))


def wrap(draw: ImageDraw.ImageDraw, text: str, text_font, max_width: int):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=text_font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def rounded_label(draw, xy, text, text_font, fill, foreground):
    left, top = xy
    box = draw.textbbox((0, 0), text, font=text_font)
    width = box[2] - box[0] + 34
    height = box[3] - box[1] + 22
    draw.rounded_rectangle(
        (left, top, left + width, top + height), radius=height // 2, fill=fill
    )
    draw.text((left + 17, top + 8), text, font=text_font, fill=foreground)


def brand_mark(draw, bold_font):
    draw.rounded_rectangle((48, 52, 102, 106), radius=14, fill=PURPLE_SOFT)
    draw.text((66, 58), "G", font=bold_font, fill=WHITE)
    draw.text((118, 64), "GRASSROOTS", font=bold_font, fill=WHITE)


def scene_frame(scene, image, progress, fonts):
    if image is None:
        canvas = Image.new("RGB", (WIDTH, HEIGHT), PURPLE)
        glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        glow_draw.ellipse((-180, 600, 900, 1680), fill=(108, 43, 234, 90))
        canvas = Image.alpha_composite(canvas.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(70)))
    else:
        pan = scene.get("pan", 0.5) + (progress - 0.5) * scene.get("travel", 0.12)
        max_x = max(0, image.width - WIDTH)
        max_y = max(0, image.height - HEIGHT)
        x = int(max_x * min(1, max(0, pan)))
        y = int(max_y * 0.5)
        canvas = image.crop((x, y, x + WIDTH, y + HEIGHT)).convert("RGBA")
        canvas = ImageEnhance.Color(canvas).enhance(0.96)
        canvas = Image.alpha_composite(canvas, SHADE)

    draw = ImageDraw.Draw(canvas)
    brand_mark(draw, fonts["brand"])

    if scene.get("end"):
        draw.rounded_rectangle((72, 250, 178, 356), radius=28, fill=PURPLE_SOFT)
        draw.text((108, 267), "G", font=fonts["logo"], fill=WHITE)
        draw.text((70, 420), "GRASSROOTS", font=fonts["end"], fill=WHITE)
        draw.text((74, 515), "Football starts here.", font=fonts["title"], fill=LIME)
        draw.text((74, 595), "Find your team. Find your game.", font=fonts["body"], fill=WHITE)
        draw.rounded_rectangle((70, 1040, 650, 1120), radius=26, fill=LIME)
        url = "alone-grassroots.pages.dev"
        box = draw.textbbox((0, 0), url, font=fonts["url"])
        draw.text(((WIDTH - (box[2] - box[0])) / 2, 1062), url, font=fonts["url"], fill=PURPLE)
        return canvas.convert("RGB")

    tag = scene.get("tag")
    if tag:
        rounded_label(draw, (48, 810), tag, fonts["tag"], LIME, PURPLE)

    y = 882
    for line in wrap(draw, scene["title"], fonts["title"], WIDTH - 96):
        draw.text((48, y), line, font=fonts["title"], fill=WHITE)
        y += 70
    if scene.get("subtitle"):
        y += 12
        for line in wrap(draw, scene["subtitle"], fonts["body"], WIDTH - 96):
            draw.text((50, y), line, font=fonts["body"], fill=(237, 230, 242))
            y += 43

    if scene.get("pill"):
        rounded_label(
            draw,
            (48, min(1190, y + 22)),
            scene["pill"],
            fonts["pill"],
            PURPLE_SOFT,
            WHITE,
        )
    return canvas.convert("RGB")


def blend(a, b, amount):
    return Image.blend(a, b, min(1.0, max(0.0, amount)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", required=True)
    parser.add_argument("--voice", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    visual_output = output.with_name(f"{output.stem}-visual.mp4")
    regular = root / "node_modules/@expo-google-fonts/archivo/400Regular/Archivo_400Regular.ttf"
    bold = root / "node_modules/@expo-google-fonts/archivo/700Bold/Archivo_700Bold.ttf"
    black = root / "node_modules/@expo-google-fonts/archivo/900Black/Archivo_900Black.ttf"
    fonts = {
        "brand": font(bold, 24),
        "logo": font(black, 62),
        "end": font(black, 62),
        "title": font(black, 53),
        "body": font(regular, 29),
        "tag": font(bold, 19),
        "pill": font(bold, 18),
        "url": font(bold, 27),
    }
    assets = root / "assets"
    marketing = assets / "marketing"
    scenes = [
        {
            "image": assets / "grassroots-kickoff.png",
            "duration": 4.0,
            "tag": "COMMUNITY FOOTBALL",
            "title": "Finding a proper game should be easier.",
            "subtitle": "Football talent is everywhere. Opportunity is not.",
            "pan": 0.5,
            "travel": 0.04,
        },
        {
            "image": marketing / "grassroots-organisers.jpg",
            "duration": 4.0,
            "tag": "BUILD YOUR TEAM",
            "title": "Bring your football community together.",
            "subtitle": "Create a team, add players and keep everyone connected.",
            "pill": "Team created",
            "pan": 0.35,
        },
        {
            "image": marketing / "grassroots-opportunity.jpg",
            "duration": 4.5,
            "tag": "NEARBY FIRST",
            "title": "Find the right game around you.",
            "subtitle": "Match by location, availability, age group and playing level.",
            "pill": "Nearby teams",
            "pan": 0.55,
        },
        {
            "image": marketing / "grassroots-organisers.jpg",
            "duration": 4.5,
            "tag": "ONE PLACE",
            "title": "Challenge. Agree. Play.",
            "subtitle": "Kickoff, ground, referee, costs and private match chat together.",
            "pill": "Match accepted",
            "pan": 0.62,
            "travel": -0.12,
        },
        {
            "image": marketing / "grassroots-opportunity.jpg",
            "duration": 4.5,
            "tag": "EVERY ROLE MATTERS",
            "title": "Players. Coaches. Referees. Scouts. Sponsors.",
            "subtitle": "One grassroots football network, built for the whole community.",
            "pan": 0.35,
        },
        {
            "image": marketing / "grassroots-match.jpg",
            "duration": 5.0,
            "tag": "YOUR FOOTBALL HISTORY",
            "title": "Play the match. Confirm the result.",
            "subtitle": "Build trusted player, team and tournament records over time.",
            "pill": "Score confirmed",
            "pan": 0.62,
            "travel": -0.16,
        },
        {"image": None, "duration": 4.0, "end": True},
    ]
    for scene in scenes:
        scene["loaded"] = (
            prepare_cover(Image.open(scene["image"])) if scene["image"] else None
        )

    command = [
        args.ffmpeg,
        "-y",
        "-f",
        "rawvideo",
        "-vcodec",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{WIDTH}x{HEIGHT}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "19",
        "-pix_fmt",
        "yuv420p",
        str(visual_output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    transition_seconds = 0.45
    for index, scene in enumerate(scenes):
        frame_count = int(scene["duration"] * FPS)
        for frame_index in range(frame_count):
            progress = frame_index / max(1, frame_count - 1)
            frame = scene_frame(scene, scene["loaded"], progress, fonts)
            if index < len(scenes) - 1 and progress > 1 - transition_seconds / scene["duration"]:
                fade = (progress - (1 - transition_seconds / scene["duration"])) / (
                    transition_seconds / scene["duration"]
                )
                next_scene = scenes[index + 1]
                next_frame = scene_frame(next_scene, next_scene["loaded"], 0, fonts)
                frame = blend(frame, next_frame, fade)
            process.stdin.write(frame.tobytes())
    process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError("Video encoding failed")

    subprocess.run(
        [
            args.ffmpeg,
            "-y",
            "-i",
            str(visual_output),
            "-i",
            args.voice,
            "-filter_complex",
            "[1:a]atempo=1.32,volume=1.0,apad=pad_dur=3[a]",
            "-map",
            "0:v:0",
            "-map",
            "[a]",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(output),
        ],
        check=True,
    )
    try:
        visual_output.unlink(missing_ok=True)
    except PermissionError:
        pass
    print(output)


if __name__ == "__main__":
    main()
