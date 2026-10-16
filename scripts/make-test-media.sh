#!/bin/sh
# Regenerates the placeholder test videos in public/media/test with ffmpeg.
# 640×480 loops as H.264 MP4 (plays everywhere) plus VP9 WebM (fallback for
# browsers built without proprietary codecs). A CRT hides resolution, so the
# sources render small and upscale.
set -e
cd "$(dirname "$0")/.."
mkdir -p public/media/test

encode() {
  ffmpeg -y -loglevel error -f lavfi -i "$2" -t "$3" \
    -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart -an "public/media/test/$1.mp4"
  ffmpeg -y -loglevel error -i "public/media/test/$1.mp4" \
    -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 -deadline good -cpu-used 4 -an "public/media/test/$1.webm"
}

encode life \
  "life=s=160x120:mold=10:r=15:ratio=0.12:death_color=#1a0a2e:life_color=#ff4fa3,scale=640:480:flags=neighbor" 10

encode gradient-reel \
  "gradients=s=640x480:rate=30:n=5:speed=0.015:type=spiral:c0=0xff3ea5:c1=0x3ef0ff:c2=0x1a0a2e:c3=0xffd23f:c4=0x7c3aed" 12

ls -lh public/media/test
