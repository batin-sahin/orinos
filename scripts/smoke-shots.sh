#!/usr/bin/env bash
#
# Captures the Overprint review matrix into .impeccable/review/ by booting the
# real Electron app through the --smoke harness. Each run is a fresh app boot,
# so shots are deterministic given the same ORINOS_SHOT_HOME profile.
#
# Usage: scripts/smoke-shots.sh
# Needs: built dist (npm run build) and an ORINOS_SHOT_HOME profile with a
# couple of chats in it (any ~/.orinos works; a scratch home keeps it clean).

set -euo pipefail
cd "$(dirname "$0")/.."

HOME_DIR="${ORINOS_SHOT_HOME:-/tmp/orinos-smoke-home}"
OUT=.impeccable/review
TMP="${TMPDIR:-/tmp}"
PNG="$TMP/orinos-smoke.png"
ELECTRON=node_modules/.bin/electron

# Every script is one async IIFE; parts must compose with ; separators.
PRE='(async()=>{'
POST='})()'
WAIT='await new Promise(r=>setTimeout(r,250));'
PICK_SESSION='const r=[...document.querySelectorAll(".session-item")];const it=r.find(x=>x.textContent.includes("Use your tools"))||r[1]||r[0];it?.querySelector(".session-open")?.click();'
TOOLS_CLICK='document.querySelector(".tools-chip")?.click();'
HEADER_CLICK='document.querySelector(".header-menu-anchor .icon-btn")?.click();'
CARBON_SET='await window.orinos.setConfig({theme:"carbon"});'
PAPER_SET='await window.orinos.setConfig({theme:"paper"});'
MENU_SETTINGS='[...document.querySelectorAll(".menu-item")].find(b=>b.textContent.includes("Settings"))?.click();'
TABS_1='document.querySelectorAll(".settings-tabs button")[1]?.click();'
TABS_2='document.querySelectorAll(".settings-tabs button")[2]?.click();'
OPEN_PALETTE='document.querySelector(".header-btn")?.click();'
OPEN_SKILLS='[...document.querySelectorAll(".footer-btn")].find(b=>b.textContent.includes("Skills"))?.click();'
OPEN_TERMINAL='[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Open terminal"))?.click();'
SETTINGS_BTN='document.querySelector(".header-menu-anchor .icon-btn")?.click();'
BODY_CPP="$PRE$PICK_SESSION$POST"
JS() { printf '%s' "$PRE$1$POST"; }

shot() {
  local name=$1
  shift
  env "$@" "$ELECTRON" . --smoke >/dev/null 2>&1 || true
  if [[ -s "$PNG" ]]; then
    cp "$PNG" "$OUT/$name.png"
    echo "shot $name"
  else
    echo "MISS $name" >&2
  fi
  rm -f "$PNG"
}

mkdir -p "$OUT"

# Empty state (fresh chat in front).
shot empty ORINOS_HOME="$HOME_DIR"

# Shared surface with a real chat loaded.
shot desktop ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$BODY_CPP"

# Sidebar collapsed.
shot sidebar-hidden ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$(JS "$PICK_SESSION"'document.querySelector(".sidebar-collapse")?.click();')"

# Composer Tools menu disclosed.
shot tools-open ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$(JS "$PICK_SESSION$TOOLS_CLICK")"

# Header More menu disclosed.
shot header-menu ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$(JS "$PICK_SESSION$HEADER_CLICK")"

# Composer Tools menu over the empty-state chat (hover-free disclosure proof).
shot tools-open-empty ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$(JS "$TOOLS_CLICK")"

# Carbon theme (persisted for the rest of the series).
shot carbon ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$(JS "$PICK_SESSION$CARBON_SET")"

shot palette      ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$(JS "$PICK_SESSION$OPEN_PALETTE")"
shot skills       ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$(JS "$PICK_SESSION$OPEN_SKILLS")"
shot terminal     ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$(JS "$PICK_SESSION$OPEN_PALETTE$WAIT$OPEN_TERMINAL")"
shot approval     ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_APPROVAL=1 ORINOS_SMOKE_JS="$(JS "$PICK_SESSION")"
shot settings-general   ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$(JS "$PICK_SESSION$SETTINGS_BTN$WAIT$MENU_SETTINGS")"
shot settings-providers ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$(JS "$PICK_SESSION$SETTINGS_BTN$WAIT$MENU_SETTINGS$WAIT$TABS_1")"
shot settings-about     ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_JS="$(JS "$PICK_SESSION$SETTINGS_BTN$WAIT$MENU_SETTINGS$WAIT$TABS_2")"

shot user-980 ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_SIZE=980x640 ORINOS_SMOKE_JS="$BODY_CPP"

# Reduced motion, and restore the enamel theme for the next run.
shot reduced-motion ORINOS_HOME="$HOME_DIR" ORINOS_SMOKE_REDUCED=1 ORINOS_SMOKE_JS="$(JS "$PICK_SESSION$PAPER_SET")"

echo "done -> $OUT"
