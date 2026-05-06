# LoRA Training Pipeline

> **Status:** wired but stubbed. INTEL-OLLAMA-OBSIDIAN-MS0/P17-U03 ships the
> orchestration end-to-end; real Python training engages automatically when
> `peft + transformers + trl` are installed and `scripts/lora-train.py` is
> present. Until then, the script writes a structurally valid stub adapter
> so the registry → Modelfile → `ollama create` → hot-swap path is
> exercisable on every nightly run.

## What this is

`scripts/lora-train.mjs` is a Node orchestrator that:

1. **Discovers training corpora** under `mcp-server/data/training/<corpus>/`
   (each one declares its own base model + adapter name in `corpus.json`).
2. **Decides if a run is due** — defaults to a 24h cadence per adapter,
   driven by the `completedAt` timestamp in `H:/prism/state/lora-adapters/<name>/run.json`.
3. **Counts JSONL examples** and skips the corpus if it's below `min_examples`.
4. **Picks a trainer strategy:**
   - `python-peft` when peft + transformers + trl import successfully AND
     `scripts/lora-train.py` exists. Spawns the Python trainer with
     `--corpus`, `--adapter-out`, `--base-model`, `--job-id`.
   - `stub-adapter` otherwise. Writes an `adapter_config.json` matching
     the corpus training params plus a zero-byte `adapter_model.safetensors`
     placeholder. This is enough to register with `PRISMLoRAAdapterEngine`
     and to wire through `ollama create`; Ollama itself will likely refuse
     to load a zero-weight adapter, and that's a true environmental signal
     (not a wire failure).
5. **Generates an Ollama Modelfile** under
   `H:/prism/state/lora-adapters/<name>/Modelfile` containing
   `FROM <baseModel>`, `ADAPTER <adapterDir>`, sorted PARAMETER lines from
   `corpus.ollama_modelfile.parameters`, and an optional `SYSTEM` block.
6. **Calls `ollama create`** (unless `--no-ollama-create` is set) and
   records the result under `run.json`.
7. **Hot-swap-tests** the new model with a single `POST /api/generate`
   asserting non-empty response (unless `--skip-hot-swap`).
8. **Persists a run record** so the next run's cadence decision sees it.

## Directory layout

```
H:\prism-iooms0\
├─ scripts/
│   ├─ lora-train.mjs                   # orchestrator (Node)
│   ├─ lora-train.test.mjs              # 43 vitest cases (pure logic)
│   └─ lora-train.py (optional)         # Python trainer entrypoint
└─ mcp-server/data/training/
    ├─ lathe-lora/                      # corpus folder (1+ allowed)
    │   ├─ corpus.json                  # manifest (schema below)
    │   └─ examples.jsonl               # one JSON object per line

H:/prism/state/lora-adapters/           # cross-PC persistent (P17-U02)
├─ lathe-lora-poc/
│   ├─ adapter_config.json              # peft format
│   ├─ adapter_model.safetensors        # weights (real or stub)
│   ├─ Modelfile                        # ollama create input
│   ├─ prism.json                       # PRISMLoRAAdapterEngine descriptor
│   └─ run.json                         # last training-run record
```

## `corpus.json` schema

| Field                       | Type                | Notes                                                                                              |
| --------------------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `schemaVersion`             | string              | "1.0.0"                                                                                            |
| `name`                      | string              | Folder name (used for logs only)                                                                   |
| `description`               | string?             | Free text                                                                                          |
| `base_model`                | string              | Ollama model tag (`qwen2.5-coder:7b`, `llama3.2:3b`, …)                                            |
| `adapter_name`              | string              | Becomes the new model name in Ollama; restricted to `[A-Za-z0-9._-]+`                              |
| `adapter_target`            | string              | Currently only `"ollama"` is supported                                                             |
| `corpus_files`              | string[]            | JSONL files (relative to corpus dir)                                                               |
| `min_examples`              | non-negative int    | Skip the run if total examples < this                                                              |
| `training`                  | object?             | `{ epochs, learning_rate, rank, alpha, dropout, max_seq_length, batch_size }` — passed to Python   |
| `ollama_modelfile`          | object?             | `{ parameters: {key:value}, system: string }` — emitted into the generated Modelfile               |
| `tags`                      | string[]?           | Free-form labels                                                                                   |

## JSONL example shape

```jsonl
{"prompt": "...", "completion": "..."}
```

Other shapes (`messages: [...]`, `instruction/input/output`) are accepted
by the orchestrator (only `validateCorpusManifest` and `countJsonlExamples`
care). The Python trainer sets the contract once it lands.

## Adding a new corpus

1. `mkdir mcp-server/data/training/<my-corpus>`
2. Drop `corpus.json` + one or more `*.jsonl` files into it.
3. Run `node scripts/lora-train.mjs --corpus <my-corpus> --dry-run --json`
   to validate the manifest before consuming Python time.
4. Run without `--dry-run` to train (or stub).
5. The next nightly cron picks up the corpus automatically.

## CLI

```bash
node scripts/lora-train.mjs                          # all due corpora
node scripts/lora-train.mjs --corpus lathe-lora      # one corpus only
node scripts/lora-train.mjs --dry-run                # validate + plan, no I/O
node scripts/lora-train.mjs --json                   # machine-readable output
node scripts/lora-train.mjs --no-ollama-create       # write adapter, skip Ollama
node scripts/lora-train.mjs --skip-hot-swap          # skip post-create generate test
node scripts/lora-train.mjs --interval-hours 168     # weekly cadence
node scripts/lora-train.mjs --force                  # ignore cadence
```

Exit codes: `0` success, `1` bad args / missing training root,
`2` corpus manifest invalid, `3` trainer failed, `4` Ollama create / hot-swap failed.

Environment variables:
- `PYTHON_BIN` — defaults to `H:/Tools/python/python.exe`
- `OLLAMA_BASE_URL` — defaults to `http://127.0.0.1:11434`

## Hot-swap flow

```
        ┌────────────────────┐
        │ corpus + JSONL     │
        └─────────┬──────────┘
                  │
        ┌─────────▼──────────┐         ┌─────────────────────────┐
        │ lora-train.mjs     │ python? │ scripts/lora-train.py    │
        │ (Node orchestrator)├─────────▶ peft.LoRA + Trainer.fit  │
        └─────────┬──────────┘  yes    └─────────┬────────────────┘
              no  │                              │
                  │                              ▼
                  │       ┌──────────────────────────────────────┐
                  └──────▶│ H:/prism/state/lora-adapters/<name>/ │
                          │ adapter_config.json + safetensors    │
                          └──────────────────┬───────────────────┘
                                             │
                          ┌──────────────────▼───────────────────┐
                          │ Modelfile (FROM + ADAPTER + PARAMs)  │
                          └──────────────────┬───────────────────┘
                                             │
                          ┌──────────────────▼───────────────────┐
                          │ POST http://localhost:11434/api/create│
                          └──────────────────┬───────────────────┘
                                             │
                          ┌──────────────────▼───────────────────┐
                          │ POST .../api/generate model=<name>   │
                          │ assert response.length > 0           │
                          └──────────────────────────────────────┘
```

## Cron registration

The script is meant to run nightly. On the deployment host:

- **Linux:** `crontab -e` → `0 2 * * *  cd /path/to/prism && node scripts/lora-train.mjs --json >> /path/to/log 2>&1`
- **Windows Task Scheduler:** import the action as
  `node H:\prism\scripts\lora-train.mjs --json` daily at 02:00.
- **Phase P19 (next milestone)** wires the cron registration as a managed
  `prism-cron` job rather than relying on host-level scheduling.

## Troubleshooting

| Symptom                                                            | Likely cause                                | Fix                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `error: training-root-missing`                                     | running outside the repo                    | `cd` into the repo root (or to `H:/prism-iooms0`)                                            |
| Every corpus shows `SKIP (recently-trained)`                       | run.json from a prior run still fresh       | `--force` or wait for the cadence window                                                     |
| `strategy: stub-adapter, reason: no-peft`                          | Python is present, training stack isn't     | `pip install peft transformers trl accelerate` in the env at `PYTHON_BIN`                    |
| Ollama `create` returns 4xx                                        | adapter file is the zero-byte stub          | install peft (above); real safetensors will load                                             |
| `ollamaCreate.body` mentions "manifest unknown"                    | base_model not pulled                       | `ollama pull <base_model>` (e.g. `ollama pull qwen2.5-coder:7b`)                             |
| `hotSwap.reason: empty-response`                                   | Ollama loaded but model returned nothing    | check Ollama logs; bump `num_ctx` in `corpus.ollama_modelfile.parameters`                    |
| Tests pass but cron run does nothing                               | cron environment has different cwd          | use `cd /repo && node scripts/lora-train.mjs` in the cron command                            |

## Wired engines (already on disk)

- `mcp-server/src/engines/PRISMLoRAAdapterEngine.ts` — adapter registry
  (descriptor schema, register/list/activate/get/remove). Receives the
  output of every successful run via `prism.json`.
- `mcp-server/src/engines/IncrementalLearningEngine.ts` — the manifest +
  job-lifecycle side. The current orchestrator builds a corpus-driven
  manifest directly; a future revision hands the manifest to this engine
  and lets it own the pending → running → done state transitions.

Both engines are currently **not** wired to a dispatcher. Surfacing them
through `prism_ai` is queued as a follow-up unit (out of P17-U03 scope).

## What this is NOT

- Not a GPU manager — peft + accelerate decide that side, and the orchestrator
  doesn't probe for CUDA. Out-of-memory is reported as a Python exit code.
- Not an evaluator — there's no held-out eval split or BLEU/ROUGE scoring
  here. Hot-swap is a wire test, not a quality test.
- Not a model-router — `ModelRouterEngine` (P20-U03) handles which adapter
  each task uses; `lora-train.mjs` only produces the adapters.

## Provenance

Created for `INTEL-OLLAMA-OBSIDIAN-MS0/P17-U03`. Tests live next to the
script (`scripts/lora-train.test.mjs`). The lathe-lora corpus is intentionally
non-machining (cooking) so the wire is verifiable without conflating with
the production lathe domain — real machining corpora land under their own
folders in P18+.
