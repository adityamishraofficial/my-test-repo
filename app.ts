# Roo Code prompt — PrimeNG 19 → 20 code migration

Use **Code mode**. Paste everything below the line as your first message.
Keep write-tool auto-approve **off** for the first two component families, then enable it once you
trust the diffs.

---

You are migrating an Angular workspace from PrimeNG 19 to PrimeNG 20. The dependency versions in
`package.json` have **already** been upgraded and `npm install` has already succeeded. Your job is
**only** the source-code changes.

## Repository shape

- Angular workspace, **NgModule-based** (not standalone components).
- `projects/ng-wings` — the publishable component library (published as `f-ng-wings-lib`).
- `projects/ng-wings-showcase` — demo app that consumes the library.
- PrimeNG is the primary UI library.

## Absolute constraints

1. **Never edit** `package.json`, `package-lock.json`, or anything in `node_modules/`, `dist/`,
   `.angular/`, or `patches/`. If you believe a dependency change is needed, write it into the
   TODO file and stop — do not make it.
2. **Never reformat, re-indent, or reorder code you are not migrating.** Diffs must contain only
   migration changes. No prettier runs, no import sorting, no trailing-whitespace cleanup.
3. Use `apply_diff` or `search_and_replace` for edits. Do **not** use `write_to_file` on an
   existing file — you will lose content.
4. Do not touch `angular2-multiselect-dropdown` usages. That package is out of scope even though
   it looks broken.
5. One component family per pass. Do not start a new family until the current one builds.

## Step 0 — Verify the mapping against the installed source (mandatory)

The mapping table below is my best reconstruction, not gospel. Before applying **any** family,
confirm the real names against the package that is actually installed:

```
ls node_modules/primeng
cat node_modules/primeng/select/index.d.ts
grep -rn "selector:" node_modules/primeng/select/
```

For each family, confirm three things and record them in the TODO file:
- the **entry-point path** (`primeng/select`)
- the exported **NgModule class** (`SelectModule`)
- the actual **selector string** on the component

If the installed package disagrees with my table, **the installed package wins.** Say so
explicitly in your progress notes.

## Step 1 — Build an inventory

Create `MIGRATION-TODO.md` at the repo root. For each family below, search the whole of
`projects/` (`*.html`, `*.ts`, `*.scss`) and record the exact file paths and line numbers where it
appears, plus a count. Search selectors, module class names, and import paths separately —
templates and TypeScript need different greps.

Do not edit any source file during this step. Show me the inventory and wait for my go-ahead.

## Step 2 — The mapping table

### Group A — mechanical renames (safe, do these first)

| Old selector | New selector | Old import | New import | Old module | New module |
|---|---|---|---|---|---|
| `p-dropdown` | `p-select` | `primeng/dropdown` | `primeng/select` | `DropdownModule` | `SelectModule` |
| `p-calendar` | `p-datepicker` | `primeng/calendar` | `primeng/datepicker` | `CalendarModule` | `DatePickerModule` |
| `p-inputSwitch` | `p-toggleswitch` | `primeng/inputswitch` | `primeng/toggleswitch` | `InputSwitchModule` | `ToggleSwitchModule` |
| `p-sidebar` | `p-drawer` | `primeng/sidebar` | `primeng/drawer` | `SidebarModule` | `DrawerModule` |
| `p-overlayPanel` | `p-popover` | `primeng/overlaypanel` | `primeng/popover` | `OverlayPanelModule` | `PopoverModule` |

For each of these you must change **all five** of:
1. The selector in `.html` templates (opening **and** closing tags).
2. The `import { XModule } from 'primeng/x'` line in every `*.module.ts`.
3. The entry in that module's `imports: [...]` array.
4. Any `ViewChild`/`ContentChild` type annotations referencing the component class
   (`@ViewChild(Dropdown)` → `@ViewChild(Select)`), including the type-only import.
5. Any template ref variable **type** usage in `.ts` — but **leave the ref variable name alone**
   (`#dd` stays `#dd`; only the type changes). Renaming refs creates churn for no benefit.

Do **not** rename input/output bindings in Group A. `[options]`, `optionLabel`, `optionValue`,
`[(ngModel)]`, `dateFormat`, `[showIcon]`, `visible`, `position`, `appendTo` all carry over
unchanged. If the build later says otherwise, fix it then — do not pre-emptively guess.

### Group B — structural rewrites (do NOT auto-apply)

These are not renames. The DOM structure changes, so a find-and-replace will produce broken
templates.

| Old | New |
|---|---|
| `p-tabView` + `p-tabPanel header="X"` | `p-tabs` + `p-tablist` + `p-tab` + `p-tabpanels` + `p-tabpanel value="X"` |
| `p-accordion` + `p-accordionTab header="X"` | `p-accordion` + `p-accordion-panel value="0"` + `p-accordion-header` + `p-accordion-content` |
| `p-messages [value]="msgs"` (array) | `p-message` (renders one message; needs an `@for` loop over the array) |
| `p-chips` | `p-autocomplete` with `[multiple]="true"` and no suggestions source |

For each occurrence of Group B:
1. Read the full template block.
2. Read the corresponding component `.ts` for any programmatic interaction (tab index tracking,
   `activeIndex`, message arrays, chip add/remove handlers).
3. Write a **proposed** rewrite into `MIGRATION-TODO.md` under that file's heading.
4. **Stop and show me the proposal.** Do not apply it until I approve.

`activeIndex` on tabs and accordion is replaced by a `value`-based API — the semantics change from
numeric index to a value token, which usually means the component's TypeScript state needs editing
too. Never assume the numeric index maps directly.

### Group C — theming

Search for `@primeng/themes`. The package no longer exists; it is now `@primeuix/themes`. The
import specifier changes, the preset names (`Aura`, `Lara`, etc.) and the `providePrimeNG({ theme:
{ preset, options } })` shape do not. Example:

```ts
// before
import Aura from '@primeng/themes/aura';
// after
import Aura from '@primeuix/themes/aura';
```

If `@primeuix/themes` is not present in `node_modules`, record that in the TODO file and stop —
that is a dependency change, which is out of scope for you.

### Group D — SCSS

PrimeNG 20 CSS class names largely track the selectors. Search `*.scss` for `.p-dropdown`,
`.p-calendar`, `.p-inputswitch`, `.p-sidebar`, `.p-overlaypanel` and any `::ng-deep` blocks
targeting them. **Do not blind-rename these.** For each hit, verify the class actually emitted by
the new component:

```
grep -rn "p-select" node_modules/primeng/select/
```

Report what you find before changing styles. Wrong style renames fail silently at runtime, which
is worse than a compile error.

## Step 3 — Execution order

Work in this order, one item at a time:

1. Group A: `p-dropdown` → `p-select`. Build. Commit.
2. Group A: `p-calendar` → `p-datepicker`. Build. Commit.
3. Group A: remaining three. Build. Commit.
4. Group C: theming. Build. Commit.
5. Group D: SCSS, after reporting findings.
6. Group B: one family at a time, each with my approval.

After every item run, in this order:

```
npx ng build ng-wings
npx ng build ng-wings-showcase
```

The library must build before the showcase — the showcase resolves against `dist/`. If the library
build fails, fix it before touching the showcase.

Commit message format: `refactor(primeng20): p-dropdown -> p-select`

## Step 4 — Reporting

After each item, tell me:
- files changed and line counts
- whether both builds passed
- any occurrence you skipped and why
- remaining unchecked boxes in `MIGRATION-TODO.md`

Do not summarise optimistically. If a build failed, lead with that.

## Hard stops — stop and ask, do not improvise

- A template uses a PrimeNG component not in my table above.
- A component's inputs/outputs don't line up after a Group A rename.
- A rename would touch a `.spec.ts` file's assertions on rendered DOM.
- Any change would require editing `package.json`.
- More than 40 files would change in a single item.

---

# Second prompt — Angular 20 code migration (run separately, after the above is merged)

You are finishing an Angular 19 → 20 upgrade. Dependencies are already at Angular 20.3.x and
`ng update` schematics have already run. Find and fix only what the schematics missed.

Same constraints as before: no `package.json` edits, no reformatting, `apply_diff` only, one item
per commit, build after each.

1. **`ng-reflect-*` attributes are removed in dev mode in v20.** Any test asserting on them will
   fail. Search `projects/**/*.spec.ts` for `ng-reflect` and rewrite those assertions to check
   component state or rendered text instead. Report each one before changing it — the correct
   replacement assertion depends on intent.
2. **`TestBed.flushEffects()` is removed.** Replace with `TestBed.tick()`. Search `flushEffects`.
3. **`afterRender` / `afterNextRender` phase API renames** (`afterRender` → `afterEveryRender`).
   Only relevant if render hooks are used; search and report before editing.
4. **`@angular/platform-browser-dynamic` is deprecated but not removed.** Do **not** migrate it.
   Just list every file importing from it in `MIGRATION-TODO.md` for a future PR.
5. Do **not** run the control-flow migration (`*ngIf` → `@if`). That is a separate PR.

Then run:

```
npx ng build ng-wings
npx ng build ng-wings-showcase
npm run test:lib
npm run test:showcase
npm run lint
```

Report failures grouped by root cause, not file by file.
