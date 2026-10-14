#!/usr/bin/env bash
# =============================================================
#  Highlight reel: stitch every exported guestbook clip into ONE
#  video for the couple (videos, boomerangs, photos as 3s stills).
#
#  Needs ffmpeg (Mac: `brew install ffmpeg`, Windows: use WSL or Git Bash + ffmpeg).
#  Usage:  ./make-highlight-reel.sh <folder-with-exported-files> [output.mp4] [max-seconds-per-clip]
#  Example: ./make-highlight-reel.sh ~/Desktop/AaravDiya highlight.mp4 20
#  Files are used in name order — the app numbers them (001, 002…) so order = recording order.
# =============================================================
set -euo pipefail
IN="${1:?Usage: $0 <folder> [output.mp4] [max-seconds-per-clip]}"
OUT="${2:-highlight-reel.mp4}"
MAX="${3:-30}"
W=1920; H=1080
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
VF="scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30,format=yuv420p"
ENC=(-c:v libx264 -preset veryfast -crf 19 -c:a aac -b:a 192k -ar 48000 -ac 2)
i=0
shopt -s nullglob nocaseglob nocasematch
for f in "$IN"/*; do            # name order = recording order
  case "$f" in *.mp4|*.mov|*.webm|*.m4v|*.jpg|*.jpeg|*.png) ;; *) continue ;; esac
  i=$((i+1)); n=$(printf "%03d" "$i"); out="$TMP/$n.mp4"
  case "$f" in
    *.jpg|*.jpeg|*.png)
      ffmpeg -v error -y -loop 1 -t 3 -i "$f" -f lavfi -t 3 -i anullsrc=r=48000:cl=stereo \
        -vf "$VF,fade=t=in:st=0:d=0.4,fade=t=out:st=2.6:d=0.4" -shortest "${ENC[@]}" "$out" ;;
    *)
      dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" | cut -d. -f1); [[ "$dur" =~ ^[0-9]+$ ]] || dur=$MAX
      [ "$dur" -gt "$MAX" ] && dur=$MAX; [ "$dur" -lt 1 ] && dur=1
      fo=$(awk "BEGIN{print ($dur>1)?$dur-0.5:0}")
      if [ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f")" ]; then
        ffmpeg -v error -y -i "$f" -t "$dur" -vf "$VF,fade=t=in:st=0:d=0.4,fade=t=out:st=$fo:d=0.5" \
          -af "aresample=48000,afade=t=in:st=0:d=0.3,afade=t=out:st=$fo:d=0.5" "${ENC[@]}" "$out"
      else  # boomerangs have no sound — add silence so all clips match
        ffmpeg -v error -y -i "$f" -f lavfi -i anullsrc=r=48000:cl=stereo -t "$dur" \
          -vf "$VF,fade=t=in:st=0:d=0.4,fade=t=out:st=$fo:d=0.5" -shortest "${ENC[@]}" "$out"
      fi ;;
  esac
  echo "file '$out'" >> "$TMP/list.txt"
  echo "  ✓ $(basename "$f")"
done
[ "$i" -eq 0 ] && { echo "No clips found in $IN"; exit 1; }
ffmpeg -v error -y -f concat -safe 0 -i "$TMP/list.txt" -c copy -movflags +faststart "$OUT"
echo "Done → $OUT  ($i items)"
