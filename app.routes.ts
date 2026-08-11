Let me pin down the exact current versions of the remaining packages.

Here are the two blocks, drop-in. Angular entries left at 21.x so `ng update` bumps them afterward.

## `dependencies`

```json
"dependencies": {
  "@angular/animations": "^21.2.19",
  "@angular/cdk": "^22.1.1",
  "@angular/common": "^21.2.19",
  "@angular/compiler": "^21.2.19",
  "@angular/core": "^21.2.19",
  "@angular/forms": "^21.2.19",
  "@angular/platform-browser": "^21.2.19",
  "@angular/platform-browser-dynamic": "^21.2.19",
  "@angular/router": "^21.2.19",
  "@fortawesome/angular-fontawesome": "^5.1.0",
  "@fortawesome/fontawesome-svg-core": "^6.5.2",
  "@fortawesome/free-solid-svg-icons": "^6.5.2",
  "@ngx-translate/core": "^18.0.0",
  "@primeuix/themes": "^3.0.0",
  "autonumeric": "^4.10.8",
  "concurrently": "^8.2.2",
  "copyfiles": "^2.4.1",
  "fast-json-patch": "^3.1.1",
  "font-awesome": "^4.7.0",
  "lodash": "^4.17.21",
  "node-fetch": "^3.3.2",
  "primeicons": "^8.0.0",
  "primeng": "^22.0.0",
  "rxjs": "^7.8.1",
  "tslib": "^2.6.2",
  "zone.js": "~0.16.0"
}
```

## `devDependencies`

```json
"devDependencies": {
  "@angular-devkit/build-angular": "21.2.20",
  "@angular-eslint/builder": "21.4.0",
  "@angular-eslint/eslint-plugin": "21.4.0",
  "@angular-eslint/eslint-plugin-template": "21.4.0",
  "@angular-eslint/schematics": "21.4.0",
  "@angular-eslint/template-parser": "21.4.0",
  "@angular/build": "21.2.20",
  "@angular/cli": "21.2.20",
  "@angular/compiler-cli": "21.2.19",
  "@angular/language-service": "21.2.19",
  "@faker-js/faker": "^8.0.2",
  "@types/jest": "^30.0.0",
  "@types/lodash": "^4.14.200",
  "@typescript-eslint/eslint-plugin": "^8.67.0",
  "@typescript-eslint/parser": "^8.67.0",
  "connect": "^3.7.0",
  "eslint": "^8.57.1",
  "jest": "^30.4.2",
  "jest-preset-angular": "^16.2.0",
  "ng-packagr": "21.2.2",
  "ts-jest": "^29.4.12",
  "typescript": "~5.9.3"
}
```

## What changed and why

**Removed:** `angular2-multiselect-dropdown` — dead since July 2024. Grep first: `grep -rn "angular2-multiselect" projects/`

**Added:** `@angular/cdk` at `^22.1.1`. It's **not currently in your file**, but PrimeNG has peered it since v18 and PrimeNG 22 requires `^22.0.0` — you've been relying on a hoisted transitive. Make it explicit. (If you'd rather `ng update @angular/cdk@22` add it, drop this line and do it in the Angular pass.)

**Bumped:**
- `@fortawesome/angular-fontawesome` 2 → 5 (only version peering ng22)
- `@ngx-translate/core` 17 → 18
- `primeng` 21.1.9 → 22.0.0
- `jest-preset-angular` 16.1.5 → **16.2.0** — 16.1.5 caps at `<22.0.0`; 16.2.0 widened to `<23.0.0`. Minimal hop, no config change.
- `@typescript-eslint/*` → 8.67.0 (peers `typescript <6.1.0`; older 8.63 caps below TS 6)
- `ts-jest` → 29.4.12 (peers `typescript <7`)
- `@types/jest` 29 → 30 (you're on jest 30; the mismatch has been silently wrong)

## Two notes before you run it

**FontAwesome icon packages stay on 6.x.** `angular-fontawesome@5.1.0` only peers `@angular/core`, nothing on svg-core — so 6.5.2 installs cleanly. But FA icons are now at 7.3.1, and v5 of the Angular wrapper was almost certainly developed against FA 7. Verify icons actually render in the showcase; if they're broken, bumping both to `^7.3.1` is a separate ticket (icon renames involved).

**`typescript` intentionally left at `~5.9.3`.** Let `ng update @angular/core@22` move it, then immediately pin:

```bash
npm pkg set devDependencies.typescript="~6.0.3" && npm i && npx tsc -v
```

Angular 22 requires `>=6.0 <6.1`. npm's `latest` is **7.0.2** — if anything resolves TS to 7, compiler-cli fails hard.

Then:

```bash
npm i   # expect this to succeed WITHOUT --force now
```

That's the tell that the FontAwesome and multiselect fixes worked. If it still fails, paste the `ERESOLVE` tree and I'll read it.
