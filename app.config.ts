# wings-front `package.json` — Angular 21 blocks

**Read first:** your screenshots only showed lines 38–115. I do not have lines 1–37 (`name`, `version`, `scripts`, `jest` config, `overrides`, etc.), so this is **not** a whole-file replacement — writing one would silently destroy your scripts block.

What follows replaces **lines 39–114 only**: the `"dependencies"` and `"devDependencies"` objects. Everything above line 39 and the closing `}` on line 115 stay exactly as they are.

Key order is preserved from your file verbatim, including the `ng-wings` / `lodash` inversion at lines 74–75, so the diff reads clean.

---

## Paste-ready block

```json
  "dependencies": {
    "@angular/animations": "^21.2.22",
    "@angular/cdk": "^21.2.14",
    "@angular/common": "^21.2.22",
    "@angular/compiler": "^21.2.22",
    "@angular/core": "^21.2.22",
    "@angular/forms": "^21.2.22",
    "@angular/platform-browser": "^21.2.22",
    "@angular/platform-browser-dynamic": "^21.2.22",
    "@angular/router": "^21.2.22",
    "@fortawesome/angular-fontawesome": "^4.0.0",
    "@fortawesome/fontawesome-free": "^7.3.1",
    "@fortawesome/fontawesome-svg-core": "^7.3.1",
    "@fortawesome/free-solid-svg-icons": "^7.3.1",
    "@ngrx/component-store": "^21.1.1",
    "@ngrx/effects": "^21.1.1",
    "@ngrx/router-store": "^21.1.1",
    "@ngrx/store": "^21.1.1",
    "@ngrx/store-devtools": "^21.1.1",
    "@ngx-builders/analyze": "^4.0.0",
    "@ngx-translate/core": "^16.0.0",
    "@ngx-translate/http-loader": "^17.0.0",
    "@primeng/themes": "^21.0.4",
    "angular-oauth2-oidc": "^21.0.3",
    "angular2-multiselect-dropdown": "^9.0.0",
    "autonumeric": "^4.5.10",
    "bootstrap": "^4.6.2",
    "core-js": "^3.37.1",
    "cors": "^2.8.5",
    "fast-json-patch": "^3.1.1",
    "file-saver": "^2.0.5",
    "font-awesome": "^4.7.0",
    "hash.js": "^1.1.7",
    "jest-marbles": "^4.0.1",
    "jwt-decode": "^4.0.0",
    "ng-wings": "20.0.1-angular-20-3",
    "lodash": "^4.17.23",
    "primeflex": "^3.3.1",
    "primeicons": "^7.0.0",
    "primeng": "^21.1.9",
    "rxjs": "~7.8.1",
    "terser": "^5.31.0",
    "tslib": "^2.8.1",
    "wings-i18n": "11.0.0",
    "zone.js": "^0.15.1"
  },
  "devDependencies": {
    "@angular-builders/jest": "^21.0.4",
    "@angular-devkit/build-angular": "^21.2.23",
    "@angular-eslint/builder": "^21.4.0",
    "@angular-eslint/eslint-plugin": "^21.4.0",
    "@angular-eslint/eslint-plugin-template": "^21.4.0",
    "@angular-eslint/schematics": "^21.4.0",
    "@angular-eslint/template-parser": "^21.4.0",
    "@angular/build": "^21.2.23",
    "@angular/cli": "^21.2.23",
    "@angular/compiler-cli": "^21.2.22",
    "@angular/language-service": "^21.2.22",
    "@ngrx/schematics": "^21.1.1",
    "@openapitools/openapi-generator-cli": "^1.0.18-4.3.1",
    "@types/jest": "^30.0.0",
    "@types/node": "^20.19.43",
    "@typescript-eslint/eslint-plugin": "^8.33.1",
    "@typescript-eslint/parser": "^8.33.1",
    "@typescript-eslint/types": "^8.33.1",
    "@typescript-eslint/utils": "^8.33.1",
    "c-api-specs": "24.0.6",
    "concurrently": "^7.6.0",
    "copyfiles": "^2.4.1",
    "eslint": "^9.28.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.29.1",
    "jest": "^30.5.1",
    "jest-environment-jsdom": "^30.5.1",
    "jest-preset-angular": "^16.2.0",
    "patch-package": "^8.0.0",
    "source-map-explorer": "^2.5.3",
    "ts-node": "^10.9.2",
    "typescript": "~5.9.3"
  }
```

---

## Two things you must change before this installs

### 1. `ng-wings` — still on the Angular 20 pin

```json
"ng-wings": "20.0.1-angular-20-3",
```

I left your current value in place because I don't know what the Angular 21 build will be tagged. Once `f-ng-wings-lib` is published, replace it — likely `21.x.y-angular-21-x` following your existing convention. **`npm install` will resolve, build, and then fail at runtime or in template type-checking** if you leave the v20 library against Angular 21, because the library's own `@angular/core` peer won't match.

Same question for `wings-i18n@11.0.0` and `c-api-specs@24.0.6`: check whether either declares an `@angular/*` peer. If yes, they need Angular 21 builds too.

```bash
npm view wings-i18n@11.0.0 peerDependencies
npm view c-api-specs@24.0.6 peerDependencies
```

### 2. `c-api-specs` may already be gone from your file

Your latest screenshot shows `devDependencies` at line 83 (was 85) with `concurrently` sitting directly after `@typescript-eslint/parser` — the two lines where `c-api-specs` used to be. If you removed it to get past the Artifactory 404, the block above puts it back. Restore it only once the `.npmrc` auth is fixed, or you'll reintroduce the 404.

---

## What changed and why

| Package | From | To | Reason |
|---|---|---|---|
| `@angular/*` (9 runtime pkgs) | `^20.3.27` | `^21.2.22` | Newest v21 patch |
| `@angular/cdk` | `^20.2.14` | `^21.2.14` | `primeng@21` peers `^21.0.0` |
| `@angular/{build,cli}` | `^20.3.34` | `^21.2.23` | Newest v21 patch |
| `@angular/{compiler-cli,language-service}` | `^20.3.27` | `^21.2.22` | Must match core exactly |
| `typescript` | `~5.9.3` ← `~5.8.3` | `~5.9.3` | `compiler-cli` peers `>=5.9 <6.1`; **`@angular/build` peers `>=5.9 <6.0` — hard cap, no TS 6** |
| `@angular-eslint/*` | `^20.7.0` | `^21.4.0` | `schematics` hard-peers `@angular/cli >=21 <22` |
| **`@typescript-eslint/types`** | — | `^8.33.1` | **New.** Peer of `@angular-eslint/eslint-plugin-template`; present only transitively today, which is why `ng update` reported it missing |
| **`@typescript-eslint/utils`** | — | `^8.33.1` | **New.** Peer of both `@angular-eslint` plugins, same reason |
| **`@angular-devkit/build-angular`** | — | `^21.2.23` | **New.** `@angular-builders/jest@21.0.4` hard-peers `^21.0.0` and you don't have it. This is the fix for the peer conflict that bit you at 18→19 |
| `@ngrx/*` (6 pkgs) | `^20.1.0` | `^21.1.1` | Peers `@angular/core ^21.0.0` |
| `primeng` | `^20.4.0` | `^21.1.9` | The cdk-20 pin is what failed your `ng update` |
| `@primeng/themes` | `^20.4.0` | `^21.0.4` | Still published under this name at v21 — **no rename to `@primeuix/themes`** |
| `@fortawesome/angular-fontawesome` | `^3.0.0` | `^4.0.0` | v3 peers core `^20.0.0`; v4 peers `^21.0.0` |
| `@fortawesome/{fontawesome-free,fontawesome-svg-core,free-solid-svg-icons}` | `^6.5.2` | `^7.3.1` | `angular-fontawesome` v3 **and** v4 both hard-depend on `fontawesome-svg-core ^7`. You're running two copies of FA core right now |
| `angular-oauth2-oidc` | `^17.0.0` | `^21.0.3` | Peers are loose `>=`, so 17 installs, but you're four majors behind |
| `jest`, `jest-environment-jsdom` | `^29.7.0` | `^30.5.1` | `jest-preset-angular@16` and `@angular-builders/jest@21` both hard-peer `jest ^30.0.0` |
| `@types/jest` | `^29.5.14` | `^30.0.0` | Match Jest |
| `jest-preset-angular` | `^14.6.2` | `^16.2.0` | **v14 peers `@angular/core >=15 <21` — your hard blocker** |
| `jest-marbles` | `^3.1.1` | `^4.0.1` | Declares no `jest` peer at all, so nothing forces it — but v3 registers matchers against the Jest 29 `expect` surface. Bump it with Jest 30, not after |
| `@angular-builders/jest` | `^20.0.0` | `^21.0.4` | Peers core `^21.0.0` |
| `tslib` | `^2.6.2` | `^2.8.1` | `angular-fontawesome@4` depends on `^2.8.1`; avoids a nested duplicate |

### Deliberately left alone

- **`zone.js@^0.15.1`** — core 21 peers `~0.15.0 || ~0.16.0`. Already valid. `0.16.3` exists; no reason to take the variable.
- **`eslint@^9.28.0`** — `@angular-eslint@21` accepts `^8.57 || ^9 || ^10`. No ESLint 10 migration forced. (ESLint 10 is out; leave it.)
- **`@ngx-translate/core@^16` + `http-loader@^17`** — the version mismatch looks wrong but both peer `@angular/core >=16`, so Angular 21 is fine. v18 exists for both. Separate ticket.
- **`primeicons@^7`, `primeflex@^3.3.1`** — neither is a PrimeNG peer. v8 and v4 exist. Don't bundle cosmetic bumps into a framework upgrade.
- **`@typescript-eslint/*` at `^8.33.1`** — `8.70.0` is current, but 8.33.1 peers `typescript <6.1.0` and works with 5.9. Keeping all four `@typescript-eslint` entries on one version matters more than being current.
- **`@types/node@^20.19.43`** — matches Node 20. Angular 21 engines are `^20.19.0 || ^22.12.0 || >=24.0.0`, so Node 20 is still supported. Only bump this if you bump Node.
- **`angular2-multiselect-dropdown@^9.0.0`** — `10.0.0` exists and declares **no peer dependencies at all**, which is why it never blocks an upgrade and will instead break quietly. Leaving it pinned so it isn't a variable in this PR. Replace with `p-multiselect` as a follow-up.

---

## Install sequence

Do **not** just paste this and run `npm install`. The `ng update` schematics still need to run for the framework migrations.

```bash
# 1. Missing peers first — clears 3 of your 4 ng update warnings legitimately
npm i -D @typescript-eslint/utils@^8.33.1 @typescript-eslint/types@^8.33.1 \
         @angular-devkit/build-angular@^21.2.23

# 2. Framework, with --force for the primeng<->cdk lock (no ordering avoids it)
npx ng update @angular/core@21 @angular/cli@21 @angular/cdk@21 \
  @angular-eslint/schematics@21 --force

# 3. Repair the tree immediately — do NOT build between 2 and 3
npm i primeng@^21.1.9 @primeng/themes@^21.0.4

# 4. Now reconcile against the block above and install clean
npm i && npm ls --depth=0 2>&1 | grep -E "UNMET|invalid"
npx tsc -v     # expect 5.9.x
```

If `npm` reports a missing `jsdom` peer for `jest-preset-angular` at step 4, add `"jsdom": "^26.1.0"` to devDependencies — that matches what `jest-environment-jsdom@30.5.1` pulls in (`jsdom ^26.1.0`), so it dedupes rather than adding a second copy. Don't add it pre-emptively.

---

## Worth questioning separately (not part of this upgrade)

- **`cors@^2.8.5` in `dependencies`** — that's an Express middleware. In a frontend app's runtime deps it's almost certainly dead weight, probably left from a dev proxy or mock server. Move to `devDependencies` or drop.
- **`font-awesome@^4.7.0`** — the CSS-based FA4, coexisting with the FA7 SVG packages. Two icon systems shipping in the same bundle.
- **`jest-marbles`, `terser`** in `dependencies` — both are build/test-time only. Belongs in `devDependencies`. Harmless functionally, but they signal "production dependency" to any audit tooling.

Each of these is a one-line change and none of them belong in an Angular 21 PR.

---

## Version provenance

Every version above was read from the live npm registry on 2026-09-07 — none are estimated. What this file does **not** cover is Angular 21's and PrimeNG 21's internal breaking changes; my knowledge cutoff is May 2026 and web search is off in this session. Check `angular.dev/update-guide` (20.0 → 21.0, complexity: Complex) and the `primefaces/primeng` 21.0.0 release notes before Phase 1.




Two different failures there. Let me verify a couple of things before advising.

Both failures are separate. The peer one is the real blocker.

**The primeng/cdk lock has no clean ordering.** primeng 20 needs cdk ^20, primeng 21 needs cdk ^21 — so no install order avoids a temporarily broken tree. I checked npm: **primeng ships no `ng-update` key**, so adding `primeng@21` to the command won't work either. `--force` is the correct tool here, which is exactly the sanctioned case from the runbook (§3).

**Step 1 — fix the three eslint warnings properly.** Those aren't spurious: `@typescript-eslint/utils` and `/types` are only in your tree transitively, and `ng update` only inspects *direct* dependencies. Both exist at 8.33.1 to match what you have:

```bash
npm i -D @typescript-eslint/utils@^8.33.1 @typescript-eslint/types@^8.33.1
```

**Step 2 — force through, then immediately repair primeng.** Do not run a build between these two commands; the tree is inconsistent in the gap:

```bash
npx ng update @angular/core@21 @angular/cli@21 @angular/cdk@21 \
  @angular-eslint/schematics@21 --force

npm i primeng@^21.1.9 @primeng/themes@^21.0.4
```

Then confirm TypeScript landed correctly — the CLI bumps it for you, and `@angular/build@21` caps at `<6.0`:

```bash
npx tsc -v          # expect 5.9.x, NOT 6.x
npm ls --depth=0 2>&1 | grep -E "UNMET|invalid"
```

**On the 404:** `npm warn Unknown user config "always-auth"` is your likely cause. npm 9 removed `always-auth`, so Artifactory gets an unauthenticated request and answers 404 rather than 401. Replace it in `.npmrc` with per-registry auth:

```
//artifactory.cib.echonet/artifactory/api/npm/cobalt-npm/:_authToken=${NPM_TOKEN}
```

Your second run fetched all 73 deps fine, so it may have been transient. If it does recur and blocks you, temporarily comment `c-api-specs` out of `package.json` for the duration of the `ng update`, then restore it.
