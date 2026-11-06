#!/usr/bin/env bash
# UserPromptSubmit hook: a flow stage should start in a fresh session.
# Blocks /flow:<stage> (or /<stage>) when this session already finished a flow stage.
# Add --here to the prompt to run in the same session anyway.
input=$(cat)
command -v python3 >/dev/null || exit 0

python3 - "$input" <<'PY'
import json, re, sys
try:
    data = json.loads(sys.argv[1])
except Exception:
    sys.exit(0)
prompt = (data.get("prompt") or "").strip()
if not re.match(r"^/(flow:)?(next|intent|spec|tdr|plan|build|verify)\b", prompt):
    sys.exit(0)
if "--here" in prompt:
    sys.exit(0)
path = data.get("transcript_path")
try:
    text = open(path, encoding="utf-8", errors="ignore").read()
except Exception:
    sys.exit(0)
done = re.findall(r"Stage done: (intent|spec|tdr|plan|build|verify)\b", text)
if not done:
    sys.exit(0)
sys.stderr.write(
    f"This session already ran the flow stage '{done[-1]}'. "
    "Each stage works best in a fresh context: run /clear and send the command again. "
    "To stay in this session, add --here to the command.\n"
)
sys.exit(2)
PY
