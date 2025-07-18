# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Word Collector is a Kintone plugin that checks specified fields in Kintone applications and suggests corrections for Japanese text based on a predefined list of common writing style issues. The plugin helps maintain consistent, formal Japanese writing style across Kintone app fields.

## Current Project Status

This is a newly initialized project that requires setup of the basic Kintone plugin infrastructure. As of now, only the README.md file exists with the correction table specification.

## Key Functionality

The plugin's core purpose is to:
- Check text fields in Kintone applications
- Identify informal or incorrect Japanese expressions
- Suggest formal/correct alternatives based on a 67-entry correction table defined in README.md

## Development Commands

Currently, no build infrastructure exists. When setting up this Kintone plugin, you'll need to:

1. Initialize the Kintone plugin structure with proper directory layout:
   - `src/` for source files
   - `plugin/` for plugin package files
   - `manifest.json` for plugin configuration

2. Set up the standard Kintone plugin development workflow:
   - Create plugin packaging scripts
   - Implement the text checking logic using the correction table from README.md
   - Build configuration UI for field selection

## Important Files

- **README.md**: Contains the complete correction table (67 entries) that defines all text transformations. This is the source of truth for the plugin's correction logic.
- **.claude/settings.local.json**: Claude CLI permission settings

## Architecture Notes

Since this is a Kintone plugin, the standard architecture should include:
- `manifest.json`: Plugin metadata and configuration
- `desktop.js`: Main plugin logic for desktop views
- `config.html` & `config.js`: Configuration interface for selecting fields to check
- CSS files for styling

The correction logic should be implemented to process the 67 correction rules defined in README.md, handling various Japanese text transformations including:
- Kanji to hiragana conversions
- Informal to formal expression updates
- Terminology standardization
- Sensitive term replacements