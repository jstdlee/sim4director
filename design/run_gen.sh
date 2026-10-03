#!/usr/bin/env bash
# Hikari: poses, then outfits. Run from design/.
cd "$(dirname "$0")"
export SRC=hikari/ref.png
OUT=hikari bash edit.sh jobs_poses.txt > edit_poses.log 2>&1
SUFFIX="Keep exactly the same girl as the source image: same face, honey-orange wavy bob, sun hairclip, amber eyes, proportions, clean line art and soft cel colors. Change only the clothes as described. Full body, front view, standing with a cheerful pose, centered, with empty space around it. Solid flat uniform magenta (#FF00FF) background with nothing else. No text, letters or symbols. Wholesome and modest, suitable for all ages." \
  OUT=outfits bash edit.sh jobs_outfits.txt > edit_outfits.log 2>&1
