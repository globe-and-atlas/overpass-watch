---
generated_by: "OpenAI Codex (GPT-6)"
timestamp: "2026-09-28T06:36:21.546600-05:00"
---

# Release validation tools

Release 0.2.0 uses the existing declared Python dev dependencies in an isolated `.tmp/ci-venv`: Ruff 0.16.9, Mypy 2.3.1, pytest 9.1.1. No production runtime dependency was added. Swift/AppKit renders vector store icons on macOS. SDK publication uses the existing Pebble tool Python environment and its account provider, without printing credentials.
