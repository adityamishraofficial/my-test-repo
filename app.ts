 opencode + Qwen3.x-27B: Prompt Kit for the Dart Sass Module Migration (wings-admin-front)

Paste the master prompt below into opencode. Run it one phase at a time, starting in **Plan** mode and switching to **Build** (Tab), with a hard stop after every phase. The target model is the real **Qwen3.6-27B** or **Qwen3.5-27B** dense model, since "quen3.8-27b" does not exist. The prompt is written so it works on any Qwen3-family ~27B model, and it makes the agent check every uncertain fact (sass version, schema support, migrator flags) inside your repo before relying on it.

## TL;DR
- **Model:** there is no "Qwen3.8". The closest real models are the dense **Qwen3.6-27B**, which is newer, and **Qwen3.5-27B**. Both have long native context, native tool calling, and thinking on by default. The prompt is model-agnostic within that family.
- **Main deliverable:** a single master prompt (section A) and five per-phase prompts (section B). They share one progress file, an explicit DO-NOT list, exact commands, and verification gates after every phase: warning count, a byte-level dist diff, and a stop-and-wait checkpoint. This is sized for what a ~27B model can do reliably.
- **Supporting config:**
  - AGENTS.md rules (C).
  - An opencode.json with deny/ask/allow permissions, a local-provider `limit` block, and the Ollama `num_ctx` fix (D).
  - A run guide (E) and a list of unverified facts (F).
  - Every unverified fact is checked locally by Phase 0.

## Assumptions
- **Scope:** the proper fix only. That means migrating `@import` to `@use`/`@forward` and the global and color functions to `sass:` modules.
- **Out of scope:**
  - switching to the esbuild `application` builder;
  - changing the Angular version;
  - pinning or overriding `sass`.
- **Environment:** Windows, opencode's shell tool running Git Bash (MINGW64), and a corporate npm registry or proxy.
- **Deliberate deviation from the earlier plan:** the official `sass-migrator module` rewrites references with a namespace, e.g. `variables.$primary` and `@include mixins.button-style()`. It has no "as *" output mode. Converting all references back to `as *` by hand is exactly the kind of wide, error-prone edit a 27B model gets wrong.
  - The prompt therefore **keeps the migrator's namespaces**. Phase 3 only shortens the long relative paths to `@use 'variables';`, which keeps the same namespace because the basename doesn't change.
  - `as *` is used only for files the agent has to migrate by hand.

## A. Master prompt (primary deliverable)

Design rationale:
- **Numbered phases with hard stops.** Mid-size models drift in long loops, so each phase ends with a turn end.
- **Exact commands.** The model doesn't improvise flags.
- **Verify before relying.** `--help`, `npm ls` and the schema grep come before any use.
- **A progress file outside git history,** so it survives `/compact`, `/new` and even `git reset --hard`.
- **`set -o pipefail`.** Without it, `| tee` hides a build failure.
- **Diff the whole dist folder.** With the browser builder, component CSS is inlined into `main.js` *and* into lazy chunks.

````text
ROLE
You are a careful senior front-end engineer doing a mechanical, behaviour-preserving refactor:
migrating Dart Sass deprecated syntax in the Angular app "wings-admin-front" (repo folder
f-wings-admin/wings-admin, base branch develop). Work in small, verified steps. Correctness beats speed.

GOAL / DEFINITION OF DONE (all must be true)
1. `ng build --configuration=dev1` prints ZERO Sass deprecation warnings originating from project
   files (src/**). Warnings from node_modules/third-party are reported, not fixed.
2. Compiled output is unchanged vs baseline: `diff -ru dist-baseline dist-after` is empty, or every
   remaining hunk is explained and trivially equivalent (e.g. comment/order-neutral whitespace).
3. The build succeeds (exit code 0).
4. Only these paths changed: src/**/*.scss, angular.json, package.json + package-lock.json
   (sass-migrator devDependency ONLY), and SASS_MIGRATION_PROGRESS.md (untracked, local).

HARD CONSTRAINTS — DO NOT
- Do NOT upgrade/downgrade Angular, @angular-devkit/*, or sass. No npm "overrides"/"resolutions".
- Do NOT change the builder (@angular-devkit/build-angular:browser stays).
- NEVER run `ng serve`, `npm run start`, `npm start`, `ng test` in watch mode, `--watch`, or any
  command that does not exit on its own. Use `npx ng build ...` only.
- Do NOT touch node_modules/, dist/, .npmrc, npm registry/proxy settings, CI files, or any file
  outside the allowed list above. Do NOT edit files inside node_modules even if they warn.
- Do NOT delete files. Do NOT run `git clean`, `git push`, `git rebase`, or `git reset --hard`
  unless the user explicitly confirms in this session.
- Do NOT use `quietDeps`, `silenceDeprecations`, or any warning suppression as the fix.
- Do NOT use color.scale(). darken/lighten map ONLY to color.adjust (see Phase 3).
- Do NOT invent CLI flags. Before using a tool's flag, check its `--help`/`help` output.
- Do NOT rewrite mixin/rule bodies beyond the minimal change required. Do not "improve" styles.
- Do NOT batch more than 10 .scss files per manual edit round; rebuild after each round.
- If the same command fails twice, STOP, record it in the progress file, and report to the user.
- If anything is ambiguous, STOP and ask. Never guess silently.

ENVIRONMENT
- Windows + Git Bash (MINGW64). Use POSIX commands (grep, find, xargs, tee, diff, wc) and FORWARD
  SLASHES in all paths. If an absolute path gets mangled, prefix the command with MSYS_NO_PATHCONV=1.
- Always start build commands with `set -o pipefail;` so a failing build is not masked by `| tee`.
- Builds can take several minutes. If your shell tool accepts a timeout, use 600000 ms for ng build.
  If a build is killed by a timeout, STOP and ask the user to run the exact command in their IDE
  terminal and paste the tail of the log.
- Corporate registry/proxy: if `npm i` fails (E403, ETIMEDOUT, ECONNREFUSED, SELF_SIGNED_CERT, 401),
  STOP and ask. Never edit .npmrc or registry config, never pass --registry.

PROGRESS FILE (your memory across /compact and new sessions)
- File: SASS_MIGRATION_PROGRESS.md at the repo root. It is excluded locally via .git/info/exclude,
  so it is never committed and survives git resets.
- At the START of every session/phase: read it first and continue from "Next step".
- After EVERY phase (and after every manual batch in Phase 3) update it with this template:
    ## Status
    Current phase: <n> | Last completed step: <...> | Next step: <...>
    ## Facts verified locally
    angular version / sass version / sass-migrator version / builder / global styles entry /
    silenceDeprecations supported (browser: y/n, karma: y/n) / color migration available (y/n)
    ## Warning counts
    baseline: <n> (by ID: import=<n>, global-builtin=<n>, color-functions=<n>, slash-div=<n>, other=<n>)
    after phase <n>: <n>
    ## Commits
    <sha> <message>
    ## Files changed (running list)
    ## Open issues / needs human
- Also record the git SHA of each phase commit so rollback targets are known.

CHECKPOINT PROTOCOL (after every phase)
Print exactly:
  PHASE <n> DONE — build: <OK/FAILED> — warnings: <before> → <after> — files changed: <n>
  Commits: <sha message>
  Issues: <none | list>
  Reply "continue" to start Phase <n+1>.
Then END YOUR TURN. Do not start the next phase until the user replies "continue".

────────────────────────────────────────
PHASE 0 — SAFETY, FACTS, BASELINE (read-only except branch + logs)
0.1 Shell probe: `echo "$0"; uname -s; command -v grep find xargs tee diff wc git node npx`
    If this is not bash/MINGW, or any tool is missing, STOP and report.
0.2 `git status --porcelain` must print nothing and `git branch --show-current` must be develop.
    Otherwise STOP and ask.
0.3 `git checkout -b chore/sass-module-migration`
0.4 Local exclude (ask the user before running):
    printf '%s\n' 'SASS_MIGRATION_PROGRESS.md' 'dist-baseline/' 'dist-after/' 'build-*.log' '*.diff' >> .git/info/exclude
    Create SASS_MIGRATION_PROGRESS.md from the template.
0.5 Facts (record every answer in the progress file; do not rely on memory):
    npx ng version
    npm ls sass sass-loader @angular-devkit/build-angular
    grep -n "silenceDeprecations" node_modules/@angular-devkit/build-angular/src/builders/browser/schema.json || echo "browser builder: silenceDeprecations NOT supported"
    grep -n "silenceDeprecations" node_modules/@angular-devkit/build-angular/src/builders/karma/schema.json || echo "karma builder: silenceDeprecations NOT supported"
    In angular.json, for projects["wings-admin-front"], record: architect.build.builder,
    architect.build.options.styles (the global stylesheet entry, may NOT be src/styles.scss),
    any existing stylePreprocessorOptions, inlineStyleLanguage, and whether architect.test exists.
0.6 Baseline build:
    set -o pipefail; npx ng build --project=wings-admin-front --configuration=dev1 --output-path=dist-baseline --output-hashing=none --optimization=false --source-map=false 2>&1 | tee build-baseline.log
    If --output-hashing/--optimization/--source-map are rejected, check `npx ng build --help`, drop
    only the rejected flag, and note it. Use the SAME flags for the after-build.
    ls dist-baseline   (record the layout: styles.css, main.js, chunk files)
0.7 Counts:
    grep -c "Deprecation" build-baseline.log
    grep -oE "Deprecation \[[a-z-]+\]|\[[a-z-]+\]" build-baseline.log | sort | uniq -c
    grep -oE "src/[A-Za-z0-9_./-]+\.scss" build-baseline.log | sort | uniq -c | sort -rn
    grep -oE "node_modules/[A-Za-z0-9_@./-]+\.scss" build-baseline.log | sort | uniq -c
0.8 Inventory:
    grep -rln "@import" src --include="*.scss" | wc -l
    grep -rln "@import" src --include="*.scss"
    grep -rnE "\b(darken|lighten|saturate|desaturate|transparentize|opacify|fade-in|fade-out|mix|map-get|map-merge|map-has-key|percentage|unquote|quote|nth|length|if)\(" src --include="*.scss"
    grep -rnE "@import ['\"]~" src --include="*.scss"
    grep -rnE "@import url\(|@import ['\"][^'\"]+\.css['\"]" src --include="*.scss"
    grep -rnE "[a-z0-9)\$] / [\$0-9(]" src --include="*.scss"   (candidate slash division, review manually)
Update the progress file. CHECKPOINT. END TURN.

────────────────────────────────────────
PHASE 1 — angular.json includePaths
1.1 In projects["wings-admin-front"].architect.build.options add (MERGE with existing keys, do not
    replace the object, do not reformat the rest of the file):
      "stylePreprocessorOptions": { "includePaths": ["src/styles"] }
    Do the same in architect.test.options if architect.test exists.
1.2 `git diff angular.json` → show it. It must only add/merge that key.
1.3 Rebuild (same command as 0.6 but --output-path=dist-after, log build-phase1.log). Must succeed.
    Warning count should be unchanged.
1.4 `git add angular.json && git commit -m "chore(build): add src/styles to Sass includePaths"`
Update progress. CHECKPOINT. END TURN.

────────────────────────────────────────
PHASE 2 — automated migration with the official sass-migrator
2.1 `npm i -D --save-exact sass-migrator`  (on any registry/proxy error: STOP and ask).
    `git diff --stat package.json package-lock.json` → only sass-migrator (+ its deps in the lockfile).
2.2 `npx sass-migrator --version` and `npx sass-migrator help` and `npx sass-migrator help module`.
    Record the version, whether a `color` migration is listed, and whether these flags exist:
    --migrate-deps, --load-path, --dry-run, --verbose, --built-in-only. Use only flags that exist.
2.3 Let ENTRY = the global stylesheet recorded in 0.5 (e.g. src/styles.scss). Dry run:
    npx sass-migrator module --migrate-deps --load-path=src/styles --dry-run --verbose "ENTRY" "src/app/**/*.scss"
    - Quote globs. If the migrator reports no files or a literal "**" path, use the fallback:
      find src/app -name "*.scss" -print0 | xargs -0 npx sass-migrator module --migrate-deps --load-path=src/styles --dry-run --verbose ENTRY
    - If the dry run lists ANY file under node_modules, or errors on a "~" import or unresolvable
      URL, STOP and report the exact error. Do not work around it yourself.
2.4 Step a — built-ins only:
    npx sass-migrator module --built-in-only --migrate-deps --load-path=src/styles "ENTRY" "src/app/**/*.scss"
    Rebuild → must succeed. `git diff --stat`. Commit: "chore(sass): migrate global built-ins to sass: modules"
2.5 Step b — ONLY if `help` listed a `color` migration:
    npx sass-migrator color --migrate-deps --load-path=src/styles "ENTRY" "src/app/**/*.scss"
    Then `git diff` and CHECK: no color.scale( introduced. If it introduced color.scale, revert
    that file (`git restore <file>`) and convert by hand per Phase 3 rules.
    Rebuild → success. Commit: "chore(sass): migrate deprecated color functions" (skip if no changes).
2.6 Step c — @import → @use:
    npx sass-migrator module --migrate-deps --load-path=src/styles "ENTRY" "src/app/**/*.scss"
    Rebuild → success. Commit: "chore(sass): migrate @import to @use"
2.7 Compare warnings with baseline; list any src/** file still warning.
Update progress. CHECKPOINT. END TURN.

────────────────────────────────────────
PHASE 3 — manual cleanup (batches of ≤10 files, rebuild after each batch)
3.1 Shorten long relative paths now that includePaths contains src/styles. KEEP the namespace the
    migrator chose; do NOT rewrite member references.
      @use '../../../../styles/variables';  →  @use 'variables';
      @use '../../../../styles/mixins';     →  @use 'mixins';
    If a line has an explicit "as <ns>" or "with (...)", keep that suffix unchanged.
    Find candidates: grep -rnE "@use ['\"](\.\./)+styles/" src --include="*.scss"
    Commit: "chore(sass): use includePaths for shared partials"
3.2 src/styles/_mixins.scss must begin with its own dependencies (only those it actually uses):
      @use 'sass:color';
      @use 'variables';        (namespace as the migrator produced; or "as *" if YOU migrate by hand)
    Preserve the existing mixin bodies. Only the deprecated call changes.
3.3 Color rules (exact, no exceptions):
      darken($c, N%)   → color.adjust($c, $lightness: -N%)
      lighten($c, N%)  → color.adjust($c, $lightness: N%)
      saturate($c, N%) → color.adjust($c, $saturation: N%)
      desaturate($c,N%)→ color.adjust($c, $saturation: -N%)
      transparentize($c, A) / fade-out → color.adjust($c, $alpha: -A)
      opacify($c, A) / fade-in         → color.adjust($c, $alpha: A)
    NEVER color.scale (it is proportional, not equivalent).
    Other globals: map-get → map.get (@use 'sass:map'), percentage → math.percentage,
    slash division a / b → math.div(a, b) (@use 'sass:math'); keep `/` in e.g. font shorthand or grid.
3.4 Files the migrator could not handle: migrate by hand using the before/after examples below.
3.5 Optional barrel (only if the user asks): src/styles/_index.scss with
      @forward 'variables';
      @forward 'mixins';
PITFALLS CHECKLIST (verify each before committing a batch)
- No shared global scope: every file @use's what it references; partials @use their own deps.
- `!default` + `@use ... with (...)` only applies on the FIRST load of a module.
- A module's CSS is emitted once per compilation. A partial that outputs rules (not just
  variables/mixins) will emit those rules once, not once per importer → check the dist diff.
- `as *` can collide names; if a collision error appears, use a namespace instead.
- Members starting with - or _ are private and not visible to other modules.
- @use must come before all other rules (only @forward, @charset, variable declarations allowed
  before/among them per Sass rules). Put @forward before @use in the same file only if needed.
- Plain CSS imports stay: @import url(...), @import 'x.css' are allowed.
- Drop the webpack "~" prefix only if the user approves in Phase 2 (resolution change).
- Third-party libraries using @import internally (e.g. Bootstrap ≤5.3) still warn → report only.
Update progress after each batch. CHECKPOINT after the phase. END TURN.

BEFORE/AFTER — the user's known files (bodies not seen; preserve everything else)
src/app/app.component.scss
  BEFORE: @import '../styles/variables';
          .x { color: $primary; }
  AFTER:  @use 'variables';
          .x { color: variables.$primary; }
src/app/shared/components/blotter/blotter-actions-cell/blotter-actions-cell.component.scss
  BEFORE: @import '../../../../../styles/variables';
  AFTER:  @use 'variables';            (references become variables.$name)
src/app/shared/components/blotter/blotter.component.scss
  BEFORE: @import '../../../../styles/variables';
          @import '../../../../styles/mixins';
          ...
          @include button-style();     (line 118)
  AFTER:  @use 'variables';
          @use 'mixins';
          ...
          @include mixins.button-style();
src/styles/_mixins.scss
  BEFORE: @mixin button-style() {
            ...
            background: darken($background, 7%);   (line 21)
          }
  AFTER:  @use 'sass:color';
          @use 'variables';
          @mixin button-style() {
            ...
            background: color.adjust($background, $lightness: -7%);
          }
  NOTE: if $background comes from _variables.scss (not a local/parameter), it becomes
  variables.$background. Check before editing.

────────────────────────────────────────
PHASE 4 — verification
4.1 rm -rf dist-after is NOT allowed; instead use a new folder name if dist-after exists:
    set -o pipefail; npx ng build --project=wings-admin-front --configuration=dev1 --output-path=dist-final --output-hashing=none --optimization=false --source-map=false 2>&1 | tee build-after.log
4.2 grep -c "Deprecation" build-after.log
    grep -oE "src/[A-Za-z0-9_./-]+\.scss" build-after.log | sort | uniq -c    → must be empty
    grep -oE "node_modules/[A-Za-z0-9_@./-]+\.scss" build-after.log | sort | uniq -c   → report
4.3 diff -u dist-baseline/styles.css dist-final/styles.css
    diff -ru dist-baseline dist-final > build.diff; wc -l build.diff
    Expected: empty or near-empty. Changed color literals = wrong color conversion. Missing or
    duplicated rule blocks = a partial that emits CSS. Investigate every hunk; do not commit fixes
    without showing the user.
4.4 Ask the user to smoke-test the blotter buttons in hover state.
4.5 `git status` → confirm no dist-*, *.log, *.diff are staged or tracked.
Then print the FINAL REPORT and END TURN.

FINAL REPORT FORMAT
1. Table: | File | Change type (import→use / built-in / color / path shortening / manual) | Commit |
2. Warning counts: baseline total and by ID → final total and by ID; src/** count (must be 0).
3. Dist diff result: line count of build.diff + explanation of every remaining hunk.
4. Remaining third-party warnings: package, file, ID (not fixed, by design).
5. Needs a human: open issues, skipped files, "~" imports, anything uncertain.
6. Commits on chore/sass-module-migration (sha + message). Nothing pushed.

FAILURE & ROLLBACK
- Single bad file edit: `git restore <file>`.
- Bad uncommitted batch: `git restore .` (or `git checkout -- .`) — ask first.
- Bad phase already committed: propose `git reset --hard <previous phase SHA from progress file>`
  and WAIT for explicit user confirmation before running it.
- After any rollback: record it in the progress file, rebuild, and re-check the warning count.

START: read SASS_MIGRATION_PROGRESS.md if it exists; otherwise begin at Phase 0. In Plan mode,
only output your plan for the current phase and wait.
````

## B. Per-phase prompts (one fresh session per phase)

Rationale: a fresh `/new` session per phase keeps the 27B model's working context small, and the progress file carries state between sessions. Save the master prompt as `docs/sass-migration/MASTER.md` (or use the command in E) so each phase prompt can `@`-reference it.

```text
[P0] Read @SASS_MIGRATION_PROGRESS.md if present and @docs/sass-migration/MASTER.md. Execute ONLY
PHASE 0 exactly as written (steps 0.1–0.8), obeying all HARD CONSTRAINTS. Record every fact and
count in the progress file. Then print the CHECKPOINT block and stop.
```
```text
[P1] Read @SASS_MIGRATION_PROGRESS.md and @docs/sass-migration/MASTER.md. Confirm Phase 0 is marked
done; if not, stop. Execute ONLY PHASE 1 (angular.json includePaths, merge not replace). Rebuild,
commit, update the progress file, print the CHECKPOINT, stop.
```
```text
[P2] Read @SASS_MIGRATION_PROGRESS.md and @docs/sass-migration/MASTER.md. Execute ONLY PHASE 2.
Check `npx sass-migrator help` before any flag. Dry run first and show me the file list. If the
dry run touches node_modules or errors, stop. Three separate commits (a, b only if `color` exists,
c). No color.scale. Update progress, CHECKPOINT, stop.
```
```text
[P3] Read @SASS_MIGRATION_PROGRESS.md and @docs/sass-migration/MASTER.md. Execute ONLY PHASE 3 in
batches of at most 10 files; rebuild after each batch and log it in the progress file. Keep the
migrator's namespaces; only shorten paths. Apply the PITFALLS CHECKLIST. CHECKPOINT, stop.
```
```text
[P4] Read @SASS_MIGRATION_PROGRESS.md and @docs/sass-migration/MASTER.md. Execute ONLY PHASE 4.
Explain every hunk of build.diff. Print the FINAL REPORT in the required format. Do not push.
```

## C. AGENTS.md (repo root; merge into the existing file if `/init` already created one)

opencode loads the project-root `AGENTS.md` into every session, so these rules survive `/compact` and `/new`.

```markdown
# Project rules — wings-admin-front (Sass module migration in progress)

## Commands
- Build (the ONLY build/verify command): `set -o pipefail; npx ng build --project=wings-admin-front --configuration=dev1 ...`
- NEVER run `ng serve`, `npm run start`, `npm start`, watch modes, or any non-terminating command.
- Shell is Git Bash on Windows: POSIX tools, forward slashes, `MSYS_NO_PATHCONV=1` for mangled paths.

## Hard rules
- Do not change Angular, @angular-devkit/*, or sass versions; no npm overrides/resolutions.
- Do not change the builder (`@angular-devkit/build-angular:browser`).
- Do not edit node_modules, dist*, .npmrc, registry/proxy config, or CI files.
- Do not delete files; no `git clean`, `git push`, `git reset --hard` without explicit user confirmation.
- Never silence Sass deprecations as a fix (`quietDeps`, `silenceDeprecations`).
- Never use `color.scale`; `darken/lighten(c, N%)` → `color.adjust(c, $lightness: ∓N%)`.
- Check `--help` before using any CLI flag. If a command fails twice, stop and report.
- If npm install fails (registry/proxy), stop and ask.

## Sass conventions (after migration)
- Shared partials live in `src/styles/` and are on `stylePreprocessorOptions.includePaths`.
- Load them as `@use 'variables';` / `@use 'mixins';` (no relative `../../` paths, no `~`).
- Every file `@use`s what it references; partials `@use` their own dependencies.
- `@use 'sass:math'` + `math.div()` for division; `sass:color`, `sass:map` for built-ins.

## State
- Migration state lives in `SASS_MIGRATION_PROGRESS.md` (untracked). Read it first, update it after every phase.
- Stop after every phase and wait for the user to reply "continue".
```

## D. opencode.json (repo root)

Design notes:
- **Rule order.** Current opencode evaluates bash patterns so that the *last* matching rule wins. The catch-all `"*": "ask"` therefore comes first and the denies come last. Older versions used most-specific match, and this order is safe under both.
- **Denies.** They block the hang risk (`ng serve`) and the irreversible actions.
- **Web fetch.** `webfetch` is denied because nothing in this task needs the web, and a small model browsing is a distraction.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "edit": "ask",
    "webfetch": "deny",
    "bash": {
      "*": "ask",
      "git status*": "allow",
      "git diff*": "allow",
      "git log*": "allow",
      "git show*": "allow",
      "git branch --show-current": "allow",
      "grep *": "allow",
      "ls*": "allow",
      "cat *": "allow",
      "wc *": "allow",
      "sort*": "allow",
      "uniq*": "allow",
      "diff *": "allow",
      "tee build-*": "allow",
      "npm ls*": "allow",
      "npx ng version*": "allow",
      "npx ng build --project=wings-admin-front*": "allow",
      "set -o pipefail; npx ng build --project=wings-admin-front*": "allow",
      "npx sass-migrator --version": "allow",
      "npx sass-migrator help*": "allow",
      "npx sass-migrator * --dry-run*": "allow",
      "ng serve*": "deny",
      "npx ng serve*": "deny",
      "npm run start*": "deny",
      "npm start*": "deny",
      "*--watch*": "deny",
      "git push*": "deny",
      "git clean*": "deny",
      "rm -rf*": "deny",
      "npm config*": "deny"
    }
  },
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": { "baseURL": "http://localhost:11434/v1" },
      "models": {
        "qwen3.6:27b": {
          "name": "Qwen3.6 27B (local)",
          "limit": { "context": 65536, "output": 16384 }
        }
      }
    }
  },
  "model": "ollama/qwen3.6:27b"
}
```

Notes:
- **Model id.** Replace `qwen3.6:27b` with the exact name from `ollama list`, or with your gateway's model id. The tag shown is illustrative and unverified.
- **Corporate gateway, vLLM or LM Studio.** Use the same shape and change only `baseURL`:
  - LM Studio: `http://127.0.0.1:1234/v1`.
  - For a key, add `"apiKey": "{env:LLM_API_KEY}"` under `options`.
- **Ollama context (critical).** opencode's `limit.context` only tells opencode how much it may send. It does **not** raise Ollama's served window. Ollama's default window is small, and it silently truncates the system prompt, the tool definitions and AGENTS.md. The result is broken or missing tool calls.
  - Fix it on the server with `OLLAMA_CONTEXT_LENGTH=65536` before `ollama serve`, or with a Modelfile: `FROM <model>` + `PARAMETER num_ctx 65536`, then `ollama create qwen27b-64k -f Modelfile`.
  - Use at least 32k. 64k is recommended because build logs are long, and the prompt tells the agent to grep counts rather than read full logs.
- **vLLM.** Serve with tool calling enabled: `--enable-auto-tool-choice`, the Qwen3 tool-call parser (`qwen3_coder` for Qwen3.5/3.6), a `qwen3` reasoning parser, and `--max-model-len` ≥ 65536. Confirm the parser names against your vLLM version's docs.
- **Sampling.** The Qwen3.5/3.6 cards recommend these for thinking-mode precise coding. Set them in the Modelfile or gateway, or per agent in opencode (`"agent": { "build": { "temperature": 0.6 } }`).

| Parameter | Value |
|---|---|
| temperature | 0.6 |
| top_p | 0.95 |
| top_k | 20 |
| presence_penalty | 0 |

## E. How to run

1. **Prepare the repo.** Commit or stash all work so `git status` is clean on `develop`. Save the master prompt as `docs/sass-migration/MASTER.md`, then add `docs/sass-migration/` to `.git/info/exclude` so it doesn't dirty the tree. Save the AGENTS.md and opencode.json from C and D at the repo root; add them to the exclude file too if you don't want them committed.
2. **Optional custom command.** Create `.opencode/commands/sass-phase.md`. Use `.opencode/command/` (singular) if your opencode version doesn't pick it up; run `opencode --version` and check the commands docs.
   ```markdown
   ---
   description: Run one phase of the Sass module migration
   agent: build
   ---
   Read @SASS_MIGRATION_PROGRESS.md and @docs/sass-migration/MASTER.md.
   Execute ONLY PHASE $ARGUMENTS exactly as written, obeying all HARD CONSTRAINTS.
   Update the progress file, print the CHECKPOINT block, and stop.
   ```
   Then use `/sass-phase 0`, `/sass-phase 1` and so on.
3. **Check the model and context.** Start opencode in the JetBrains terminal from `f-wings-admin/wings-admin`. Pick the model with `/models`, and confirm that the served context is ≥ 32k (see D).
4. **Plan first.** Start in **Plan** mode (press **Tab** to switch agents) and send `[P0]` or `/sass-phase 0`. Review the planned commands.
5. **Build.** Press Tab to switch to **Build** and say "execute". Approve each `ask` prompt. Read the command text before approving `npm i` and any edit.
6. **At each checkpoint:**
   - review the diff in JetBrains (**Git → Commit tool window** or **Git → Show History** on the branch; *Compare with Branch… → develop* for the cumulative diff);
   - check `SASS_MIGRATION_PROGRESS.md`;
   - reply "continue", or better, `/new` and run the next per-phase prompt.
7. **Fresh sessions.** Run `/new` between phases, which is the recommended default for a 27B model. Use `/compact` only in the middle of Phase 3 if a long batch loop fills the context. The progress file plus AGENTS.md restore the state either way.
8. **Undo:**
   - `/undo` reverts the last message and its file changes; `/redo` restores them;
   - for committed phases, use `git reset --hard <sha>` from the progress file, run yourself after reviewing.
9. **Finish.** After Phase 4, run `npm run start` yourself, hover the blotter buttons, delete `dist-baseline/`, `dist-after/`, `dist-final/`, `*.log` and `build.diff`, then push the branch and open the PR yourself.

## F. Unverified facts and how the prompt handles them

**Important limitation:** this session had no live web or npm access. The opencode and Qwen facts below come from the official opencode docs (opencode.ai/docs: agents, rules, commands, permissions, providers, tui, cli) and the Hugging Face Qwen model cards as known up to early/mid 2026. None of them were re-fetched today. Treat every version number as needing confirmation with `npm view`.

| Fact | Status | How the prompt handles it |
|---|---|---|
| Exact model behind "quen3.8-27b" | No such model. Qwen3.6-27B (newest dense 27B) and Qwen3.5-27B exist; confirm on huggingface.co/Qwen | The prompt is model-agnostic; sampling is set outside the prompt |
| Qwen3.5/3.6 thinking toggle | Thinking is on by default; disabled via `chat_template_kwargs: {"enable_thinking": false}`. The Qwen3 `/think` and `/no_think` soft switches are reportedly not officially supported on 3.5/3.6 | Leave thinking on for this task. The prompt doesn't depend on soft switches |
| sass version bundled per Angular major | Not verified (roughly 1.80–1.85 for v19 and 1.88+ for v20, unconfirmed) | Phase 0 `npm ls sass`; no version is assumed |
| `silenceDeprecations` in browser/karma schema | Not verified | Phase 0 greps the installed schema.json files; silencing is never used as the fix |
| Latest sass-migrator, `color` migration, glob expansion | The `color` migration and quoted glob support are believed to exist; the version is not verified | Phase 2.2 `help` gate; step b is conditional; `find \| xargs` fallback |
| Dart Sass 3.0.0 release status | Not verified; believed unreleased | Irrelevant to correctness, since the fix removes deprecated usage |
| opencode commands dir (`commands/` vs `command/`), last-match-wins permission order | Docs changed across versions | Run guide says to check your version; the permission order is safe under both rules |
| opencode bash tool on Windows (Git Bash) and default timeout (~2 min) | Believed to use Git Bash; timeout overridable per call | Phase 0.1 shell probe stops if not bash; a timeout means the user runs the build manually |
