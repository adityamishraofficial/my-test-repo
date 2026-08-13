# ng-wings: Angular 19.2 → 20.3 Upgrade Runbook

All versions below were resolved against the live npm registry (13 Aug 2026).
Commands are MINGW64 / Git Bash safe. Run from the workspace root.

---

## Registry-verified target versions

| Package | Current | Target | Why |
|---|---|---|---|
| `@angular/*` (animations, common, compiler, core, forms, platform-browser, platform-browser-dynamic, router) | `^19.2.25` | `^20.3.27` | latest 20.x |
| `@angular/cli`, `@angular-devkit/build-angular` | `^19.2.27` | `^20.3.34` | latest 20.x |
| `@angular/compiler-cli`, `@angular/language-service` | `^19.2.25` | `^20.3.27` | latest 20.x |
| `ng-packagr` | `^19.2.2` | `^20.3.2` | latest 20.x |
| **`@angular/cdk`** | **missing** | **`^20.2.14`** | **PrimeNG 20 declares it as a hard peer (`^20.0.3`)** |
| `primeng` | `^19.1.4` | `^20.4.0` | latest 20.x |
| `@fortawesome/angular-fontawesome` | `^1.0.0` | `^2.0.1` | v1 peers on `@angular/core ^19` only |
| `@angular-eslint/*` | `^19.8.1` | `^20.7.0` | see Phase 1 note |
| `@primeuix/themes` | n/a | `^1.2.5` | **only if you import a PrimeNG theme preset** |

### Confirmed NO change needed

These already satisfy Angular 20 / PrimeNG 20 peers — leave them alone:

- `typescript: ~5.8.3` — Angular 20 wants `>=5.8 <6.0`. Already correct. **Do not let npm float this to 5.9+.**
- `zone.js: ~0.15.1` — peer is `~0.15.0`. OK.
- `rxjs: ^7.8.1` — OK for both Angular 20 and PrimeNG 20.
- `@ngx-translate/core: ^16.0.4` — peer is just `>=16`. OK.
- **Whole Jest stack stays put.** `jest-preset-angular@14.6.2` declares `@angular/core >=15 <21`, so it supports Angular 20. `ts-jest@29.1.1` and `jest@29.6.1` are fine. Moving to `jest-preset-angular@16` would force `jest@^30` + `jsdom@>=26` — **defer that to its own PR.**
- `@typescript-eslint/*: ^8.63.0` — satisfies `@angular-eslint@20`'s `^8` requirement.
- `eslint: ^8.57.1` — `@angular-eslint@20.7.0` peers on `^8.57.0 || ^9.0.0`, so you do **not** need the ESLint 9 flat-config migration in this PR.
- `primeicons: ^7.0.0` — no peer deps. 8.0.0 exists but is a separate icon-name churn. Skip.
- `angular2-multiselect-dropdown: ^8.0.0` — declares no peers, so it won't block install. It will still be the thing that breaks at compile time. Flagged again as replacement candidate; not in scope here.

---

## Phase 0 — Preflight

```bash
node -v          # must be ^20.19.0 || ^22.12.0 || >=24.0.0 — Node 18 is dropped in v20
npm -v
git status                                  # must be clean; ng update refuses otherwise
git checkout -b chore/angular-20
npm ls --depth=0 > ../before-deps.txt       # snapshot for diffing later
ls patches/ 2>/dev/null                     # note any patch-package patches
```

If `patches/` contains a `primeng+19.x.x.patch`, **it will not apply after the bump.** Handled in Phase 5.

Confirm `.gitattributes` still has the LF rule so patches survive:

```bash
grep -n 'patch' .gitattributes || echo '*.patch text eol=lf' >> .gitattributes
```

---

## Phase 1 — Angular core, CLI, ng-packagr, eslint (one command)

`@angular-eslint` must go in the **same** `ng update` invocation as core/CLI — running it
separately produces an unresolvable intermediate peer state.

```bash
npx @angular/cli@20 update \
  @angular/core@20 \
  @angular/cli@20 \
  ng-packagr@20 \
  @angular-eslint/schematics@20 \
  --force
```

`--force` is required because `primeng@19` and `@fortawesome/angular-fontawesome@1` both pin
`@angular/core ^19`. That gets resolved in Phase 2. `@angular-devkit/build-angular` and
`@angular/language-service` are pulled to 20.3.34 / 20.3.27 by the CLI update automatically.

Verify the TypeScript pin was not floated:

```bash
npm pkg get devDependencies.typescript      # expect "~5.8.3"
npm pkg set devDependencies.typescript="~5.8.3"   # only if it drifted
```

---

## Phase 2 — Third-party alignment

```bash
npm pkg set dependencies.primeng="^20.4.0"
npm pkg set dependencies.@angular/cdk="^20.2.14"
npm pkg set dependencies.@fortawesome/angular-fontawesome="^2.0.1"
```

Only if the library or showcase imports a PrimeNG theme preset
(`import Aura from '@primeng/themes/aura'` or similar):

```bash
npm pkg set dependencies.@primeuix/themes="^1.2.5"
```

`@primeng/themes` no longer exists — it is `@primeuix/themes` from PrimeNG 20 onward. Version
`1.2.5` is the line that matches `primeng@20.4.0` (which depends on `@primeuix/styles ^1.2.5`).
Do **not** take `@primeuix/themes@2.x` or `3.x`.

---

## Phase 3 — Clean install and peer verification

```bash
rm -rf node_modules package-lock.json
npm install                                 # NO --force this time
```

If this needs `--force`, a peer is still wrong — stop and read the error rather than forcing it.

```bash
npm ls @angular/core @angular/cdk primeng @fortawesome/angular-fontawesome --depth=0
npm ls typescript --depth=0                 # must be 5.8.x
```

---

## Phase 4 — Code migrations

### Angular 20

Walk the official diff at `https://update.angular.dev/?v=19.0-20.0` — the schematics in Phase 1
cover most of it. Manually check these, which bite NgModule + Jest codebases specifically:

1. **`ng-reflect-*` attributes are gone in dev mode.** Any Jest test asserting on
   `ng-reflect-` attributes will fail. Grep: `grep -rn "ng-reflect" src projects`
2. **`@angular/platform-browser-dynamic` is deprecated.** Not yet removed, so no action is
   forced, but `platformBrowser().bootstrapModule()` from `@angular/platform-browser` is now the
   supported path. Note it, defer it.
3. **`TestBed.flushEffects()` → `TestBed.tick()`.** Grep: `grep -rn "flushEffects" .`
4. **`afterRender` phase API renames** (`afterRender` → `afterEveryRender`). Only relevant if you
   use render hooks in the library.

### PrimeNG 20

PrimeNG 20 drops the deprecated selector aliases that 18/19 still accepted. Grep the library and
showcase templates:

```bash
grep -rn "p-dropdown\|p-calendar\|p-inputSwitch\|p-sidebar\|p-overlayPanel\|p-tabView\|p-tabPanel\|p-accordionTab\|p-messages\|p-chips" \
  projects --include=*.html --include=*.ts
```

Replacement map:

| Old | New |
|---|---|
| `p-dropdown` | `p-select` |
| `p-calendar` | `p-datepicker` |
| `p-inputSwitch` | `p-toggleswitch` |
| `p-sidebar` | `p-drawer` |
| `p-overlayPanel` | `p-popover` |
| `p-tabView` / `p-tabPanel` | `p-tabs` / `p-tabpanel` |
| `p-accordionTab` | `p-accordion-panel` |
| `p-messages` | `p-message` |
| `p-chips` | `p-autocomplete` (multiple mode) |

Also grep for the old theme import path: `grep -rn "@primeng/themes" projects`

---

## Phase 5 — Regenerate the PrimeNG patch

Your existing patch was generated against `primeng@19.1.x`; hunk offsets are stale and it will
fail or silently mis-apply. Do **not** hand-edit the hunk headers.

```bash
rm patches/primeng+19*.patch
# make your edits directly inside node_modules/primeng/... again
npx patch-package primeng
git diff --stat patches/
file patches/*.patch                        # confirm "ASCII text", not "with CRLF line terminators"
```

Then confirm it survives a reinstall:

```bash
rm -rf node_modules && npm install && grep -c . patches/*.patch
```

---

## Phase 6 — Build

```bash
npx ng build ng-wings
npx ng build ng-wings-showcase
```

Build the library first — the showcase resolves against `dist/`.

---

## Phase 7 — Test and lint

```bash
npm run test:lib
npm run test:showcase
npm run lint
```

`ng lint` may surface new `@angular-eslint@20` rules. If the count is large, disable the new rules
in `.eslintrc.json` and fix them in a follow-up PR rather than bloating this one.

---

## Phase 8 — Publish and consumer bump

```bash
npm ls --depth=0 > ../after-deps.txt
diff ../before-deps.txt ../after-deps.txt
git add -A && git commit -m "chore: upgrade Angular 19 -> 20, PrimeNG 19 -> 20"
```

Then, in `wings-front`, the consumer needs the **same** Angular 20 / PrimeNG 20 / `@angular/cdk`
alignment before it can install the new `f-ng-wings-lib` — a v20 library will peer-fail against a
v19 host. Bump both in the same coordinated release.

---

## Suggested PR split

1. **This PR** — Angular 20 + PrimeNG 20 + cdk + fontawesome 2 + `@angular-eslint` 20.
2. Follow-up — `jest-preset-angular@16` + `jest@30` + `jsdom@26`.
3. Follow-up — ESLint 9 flat config.
4. Follow-up — replace `angular2-multiselect-dropdown`.
5. Follow-up — `platform-browser-dynamic` → `platformBrowser`, control-flow migration.
