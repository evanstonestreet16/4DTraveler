#!/usr/bin/env python3
"""Backward-compatible entry point. Prefer scripts/generate-city-ambience.py."""

from pathlib import Path
import runpy

runpy.run_path(
    str(Path(__file__).with_name("generate-city-ambience.py")),
    run_name="__main__",
)
