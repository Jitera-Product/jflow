#!/usr/bin/env bash
# PreToolUse hook for Bash: blocks git and infra commands the flow never allows.
# Applies to every session where the flow plugin is installed.
input=$(cat)
command -v python3 >/dev/null || exit 0

python3 - "$input" <<'PY'
import json, re, sys
try:
    data = json.loads(sys.argv[1])
except Exception:
    sys.exit(0)
cmd = (data.get("tool_input") or {}).get("command") or ""
if not cmd:
    sys.exit(0)

rules = [
    (r"\bgh\s+pr\s+merge\b", "merging a PR is for humans"),
    (r"\bgh\s+api\b[^\n]*/merge\b", "merging a PR is for humans"),
    (r"\bgit\s+push\b[^\n;&|]*\s(--force\b|--force-with-lease\b|-f\b|\+\S)", "force push is not allowed"),
    (r"\bgit\s+push\b[^\n;&|]*\s(origin\s+)?(HEAD:)?(refs/heads/)?(main|master)\b", "pushing to main or master is not allowed"),
    (r"\bterraform\s+(apply|destroy)\b", "terraform apply/destroy is for humans"),
    (r"\bkubectl\s+delete\b", "kubectl delete is for humans"),
    (r"\baz\s+[^\n;&|]*\bdelete\b", "az ... delete is for humans"),
    (r"\bgcloud\s+[^\n;&|]*\bdelete\b", "gcloud ... delete is for humans"),
    (r"\baws\s+[^\n;&|]*\bdelete-", "aws ... delete-* is for humans"),
]
for pattern, why in rules:
    if re.search(pattern, cmd):
        sys.stderr.write(f"Blocked by the flow plugin: {why}. Command: {cmd.strip()[:200]}\n"
                         "If this is really needed, ask the human to run it.\n")
        sys.exit(2)

# Plain `git push` while on main or master.
if re.search(r"\bgit\s+push\b", cmd) and not re.search(r"\bgit\s+push\b[^\n;&|]*\s\S+\s+\S+", cmd):
    import subprocess
    cwd = data.get("cwd") or None
    try:
        branch = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=cwd,
                                capture_output=True, text=True, timeout=5).stdout.strip()
    except Exception:
        branch = ""
    if branch in ("main", "master"):
        sys.stderr.write("Blocked by the flow plugin: the current branch is "
                         f"{branch}, pushing it is not allowed.\n")
        sys.exit(2)
sys.exit(0)
PY
