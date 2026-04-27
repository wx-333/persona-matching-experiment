# Persona Matching Experiment v4

v4 is the replacement for the failed direct v3 questionnaire strategy.

The key change is stimulus selection:

1. Generate multiple prompt-only candidates for each question endpoint.
2. Reject bad candidates before the listening questionnaire.
3. Assemble the final questionnaire only from selected candidates.

This avoids the two failure modes observed earlier:

- v3 direct prompt-only generation can produce weak or ambiguous persona
  contrasts.
- DSP post-processing can create controllable acoustic changes, but pilot audio
  quality is poor and can confound the perceptual test.

## Workflow

Generate a candidate pool:

```bash
conda run --no-capture-output -n parler python generate_candidate_pool_v4.py --reps 4
```

Inspect `candidate_pool/manifest.json` and listen to the generated files. Create
`selection.json` by choosing one good target and one good negative candidate for
each question.

Use the local review page:

```bash
python3 server_v4.py
```

Then open `http://localhost:8090/candidate_review.html`. The page can load
`selection_auto_suggested.json`, but those choices are only objective-metric
sanity checks and must still be confirmed by listening.

Build the final questionnaire:

```bash
python3 build_questionnaire_from_selection.py --selection selection.json
```

The final survey assets are written to:

- `audio_samples/`
- `questions.json`

Run the final survey at `http://localhost:8090/survey.html`.

Generate a MiMo-backed questionnaire audio set:

```bash
python3 generate_mimo_questionnaire_audio.py
```

This writes:

- `mimo_audio_samples/`
- `questions_mimo.json`
- `mimo_generation_manifest.json`

Run the MiMo-backed survey at
`http://localhost:8090/survey.html?questions=questions_mimo.json&audio_dir=mimo_audio_samples`.

Generate the expanded v5 MiMo questionnaire:

```bash
python3 generate_mimo_questionnaire_audio.py \
  --spec questionnaire_v5_spec.json \
  --output-dir mimo_audio_samples_v5 \
  --questions-output questions_mimo_v5.json \
  --manifest-output mimo_generation_manifest_v5.json
```

Run the v5 MiMo-backed survey at
`http://localhost:8090/survey.html?questions=questions_mimo_v5.json&audio_dir=mimo_audio_samples_v5`.

Generate the v6 MiMo candidate pool with three candidates per target/negative
endpoint:

```bash
python3 generate_mimo_questionnaire_audio.py \
  --spec questionnaire_v6_spec.json \
  --output-dir mimo_candidate_pool_v6 \
  --questions-output questions_mimo_v6_unscreened.json \
  --manifest-output mimo_candidate_pool_v6/manifest.json \
  --reps 3
```

Do not use `questions_mimo_v6_unscreened.json` for formal testing. It is only a
raw reference before listening-based screening.

Review v6 candidates with the same selection workflow as v4:

```bash
python3 server_v4.py --port 8091
```

Open:

```text
http://localhost:8091/candidate_review.html?manifest=mimo_candidate_pool_v6/manifest.json&audio_dir=mimo_candidate_pool_v6
```

Download the reviewed selection as `selection_mimo_v6.json`, then build the
final v6 questionnaire:

```bash
python3 build_questionnaire_from_selection.py \
  --selection selection_mimo_v6.json \
  --manifest mimo_candidate_pool_v6/manifest.json \
  --candidate-dir mimo_candidate_pool_v6 \
  --audio-output-dir mimo_audio_samples_v6 \
  --questions-output questions_mimo_v6.json
```

Run the screened v6 survey at:

```text
http://localhost:8091/survey.html?questions=questions_mimo_v6.json&audio_dir=mimo_audio_samples_v6
```

Analyze downloaded results:

```bash
python3 analyze_results_v4.py
```

This reads `experiment_results_*.json`, supports both the old answer-only export
and the newer `question_results` export, and writes:

- `analysis_report_v4.md`
- `analysis_trials_v4.csv`

## Selection Criteria

Keep a candidate only if:

- the spoken text is intelligible and matches the question text;
- there are no obvious glitches, metallic artifacts, truncation, or clipping;
- the target and negative have comparable loudness and content duration;
- the intended persona contrast is audible without relying on recording-quality
  degradation.

For the paper, report this as a stimulus-screening step rather than DSP control.
