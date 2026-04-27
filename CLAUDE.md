# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This directory runs a **persona matching listening experiment** for the Parler-TTS voice persona research. Participants hear paired audio samples and choose which voice better matches a given persona description (e.g., "声音更厚重、更有共鸣感"). The experiment evaluates whether listeners can perceptually distinguish five dimensions of voice persona: somatic mass, vitality, social dominance, emotional temperature, and vocal texture. Each dimension has level 1 (low pole) and level 5 (high pole).

This is v4 of the experiment, redesigned after v3's direct prompt-only strategy failed. The key v4 innovation is **candidate screening**: generate multiple candidates per question endpoint, reject bad ones by listening, then assemble the final questionnaire only from screened candidates.

The experiment uses either a locally fine-tuned Parler-TTS model or the MiMo-V2.5-TTS-VoiceDesign API for audio generation.

## Two generation backends

### 1. Parler-TTS (local model)
Uses a fine-tuned checkpoint at `/home/wx/parler-tts/output_dir_training9992`. Generates candidate audio files for each question endpoint using 5-level persona description prompts. Runs inside the `parler` conda environment.

### 2. MiMo-V2.5-TTS-VoiceDesign (API)
Commercial TTS API at `https://api.xiaomimimo.com/v1/chat/completions` used in later experiment versions (v5/v6). Requires `MIMO_API_KEY` env var or a key scraped from the local usage guide markdown file. Generates higher-quality audio but has per-request cost and latency.

## Key files and their roles

- **`generate_candidate_pool_v4.py`** — Generates the v4 candidate pool using the local Parler-TTS model. Each question gets `--reps` candidates per target/negative endpoint. Outputs audio to `candidate_pool/` and metadata to `candidate_pool/manifest.json`.
- **`generate_mimo_questionnaire_audio.py`** — Generates audio using the MiMo API. Supports both hardcoded `QUESTION_SPECS` and external spec files (`questionnaire_v5_spec.json`, `questionnaire_v6_spec.json`). With `--reps > 1`, generates multiple candidates per endpoint for screening.
- **`build_questionnaire_from_selection.py`** — Reads a `selection.json` (human-picked target/negative candidates per question), copies selected audio files, and produces the final randomized `questions.json` with correct answers embedded.
- **`server_v4.py`** — Minimal HTTP server (Python stdlib) that serves the HTML experiment pages and audio files on `0.0.0.0:8090` (or custom `--port`). Routes `/` to the candidate review page and `/survey` to the participant-facing experiment page.
- **`analyze_results_v4.py`** — Analyzes downloaded `experiment_results_*.json` files. Computes per-question, per-dimension, and overall accuracy with binomial two-tailed p-values. Writes `analysis_report_v4.md` and `analysis_trials_v4.csv`.
- **`selection.json`** — Manual selection file mapping each question ID to chosen target/negative candidate paths. Created by listening to candidates via the review HTML page.
- **`questions.json`** / **`questions_mimo_v6.json`** — Final questionnaire definitions (question metadata + correct answers) consumed by `experiment_survey_v4.html`.
- **`experiment_survey_v4.html`** — Participant-facing A/B listening test UI. Supports query params `?questions=` and `?audio_dir=` to switch between question sets.
- **`candidate_review.html`** — Experimenter-facing review page for screening candidates. Supports `?manifest=` and `?audio_dir=` query params.

## Common workflows

### v4 (Parler-TTS, original)

```bash
# Generate candidate pool
conda run --no-capture-output -n parler python generate_candidate_pool_v4.py --reps 4

# Start review server, screen candidates by listening
python3 server_v4.py --port 8090
# Open http://localhost:8090, create selection.json

# Build screened questionnaire
python3 build_questionnaire_from_selection.py --selection selection.json

# Run the experiment survey
# Open http://localhost:8090/survey.html

# Analyze downloaded results
python3 analyze_results_v4.py
```

### v6 (MiMo with candidate screening)

```bash
# Generate 3 candidates per endpoint
python3 generate_mimo_questionnaire_audio.py \
  --spec questionnaire_v6_spec.json \
  --output-dir mimo_candidate_pool_v6 \
  --questions-output questions_mimo_v6_unscreened.json \
  --manifest-output mimo_candidate_pool_v6/manifest.json \
  --reps 3

# Review and download selection_mimo_v6.json
python3 server_v4.py --port 8091
# Open http://localhost:8091/candidate_review.html?manifest=mimo_candidate_pool_v6/manifest.json&audio_dir=mimo_candidate_pool_v6

# Build final questionnaire
python3 build_questionnaire_from_selection.py \
  --selection selection_mimo_v6.json \
  --manifest mimo_candidate_pool_v6/manifest.json \
  --candidate-dir mimo_candidate_pool_v6 \
  --audio-output-dir mimo_audio_samples_v6 \
  --questions-output questions_mimo_v6.json

# Run survey at:
# http://localhost:8091/survey.html?questions=questions_mimo_v6.json&audio_dir=mimo_audio_samples_v6
```

## Experiment design notes

- Each question plays the same English text for both A and B options — listeners judge voice/persona attributes, not text content.
- Target/negative A/B assignment is randomized at questionnaire build time; correct_answer is embedded in questions.json.
- The 5 dimensions map to 1–5 levels in the Parler-TTS prompts. Level 1 is the low/negative pole, level 5 is the high/positive pole.
- Q011 is a "full persona" multi-dimension question (not a single dimension).
- The `questions.json` format differs from the result format — the analysis script normalizes both old answer-only exports and newer `question_results` exports.

## Candidate screening criteria

Keep a candidate only when:
- Spoken text is intelligible and matches the question text
- No obvious glitches, metallic artifacts, truncation, or clipping
- Target and negative have comparable loudness and duration
- The intended persona contrast is audible without relying on recording-quality degradation

## Package and environment

- The broader project is **Parler-TTS** (`parler_tts` package), a Hugging Face TTS model using a Flan-T5 text encoder + autoregressive transformer decoder + DAC audio codec.
- Training: `accelerate launch ./training/run_parler_tts_training.py ./helpers/training_configs/starting_point_v1.json`
- Install (editable): `pip install -e .` from `/home/wx/parler-tts/`
- This experiment uses the `parler` conda environment for local model scripts.
