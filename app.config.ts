# Roo Code / Qwen Prompt Pack — Angular 20 + PrimeNG 20 migration

Five prompts. **Run them in order.** Prompts 1, 4 and 5 are safe to run in parallel Roo Code tabs; Prompts 2 and 3 must not overlap with each other.

Selectors and module names below were extracted from the actual `primeng@20.4.0` `.d.ts` files, not from documentation.

---

## Prompt A — shared preamble

**Paste this at the top of every prompt below.** Small models drift without a hard fence.

```
# CONTEXT

Repo: wings-front — a large Angular application using the classic NgModule
architecture (NOT standalone components). Windows / MINGW64.

Already done, do not redo:
- Angular 19.2.25 -> 20.3.27 (core, common, forms, router, compiler,
  platform-browser, platform-browser-dynamic, animations)
- @angular/cli + @angular/build -> 20.3.34
- @angular/cdk 19.2.19 -> 20.2.14
- @angular-eslint/* 19.8.1 -> 20.7.0
- @ngrx/* -> 20.1.0
- primeng 19.1.4 -> 20.4.0
- @primeng/themes -> 20.4.0
- TypeScript stays ~5.8.3. Jest stays 29. ESLint stays 8.57.

# ABSOLUTE RULES

1. GROUND TRUTH IS node_modules, NOT YOUR MEMORY.
   Before you use any PrimeNG selector, class, module, @Input or @Output name,
   verify it exists by grepping the installed package:
     grep -rohE 'ComponentDeclaration<[A-Za-z]+, "[^"]+"' node_modules/primeng/<entry>/*.d.ts
     grep -rohE "declare class [A-Za-z]+" node_modules/primeng/<entry>/*.d.ts
   If you cannot verify a name in node_modules, DO NOT WRITE IT. Add it to the
   report as UNVERIFIED and move on.

2. NEVER invent, guess, or "remember" a PrimeNG API. If unsure, report it.

3. STAY IN SCOPE. Do not do any of the following, even if it looks like an
   improvement:
   - Do NOT convert *ngIf / *ngFor / ngSwitch to @if / @for / @switch
   - Do NOT convert components to standalone, or remove `standalone: false`
   - Do NOT introduce signals, inject(), input(), output(), or viewChild()
   - Do NOT reformat, reorder imports, change quote style, or touch Prettier
   - Do NOT upgrade, add, or remove any package
   - Do NOT edit package.json, angular.json, tsconfig*.json, or anything in
     node_modules/ or patches/
   - Do NOT rename variables or refactor logic
   - Do NOT touch *.spec.ts unless the prompt explicitly says to

4. ONE CONCERN PER CHANGE. Do not fix an unrelated pre-existing error you
   happen to notice. Report it instead.

5. AFTER EVERY FILE, verify it still parses. Do not batch 50 files then check.

6. NEVER use `git checkout`, `git reset`, `git stash`, or delete files.

# OUTPUT FORMAT

End your run with a report, exactly this shape:

## CHANGED
<file path> — <one line: what changed>

## SKIPPED
<file path> — <why: ambiguous / structural / needs human decision>

## UNVERIFIED
<name you could not confirm in node_modules> — <file path where it appears>

## PRE-EXISTING ISSUES NOTICED
<file path> — <what, one line — do not fix>
```

---

## Prompt 1 — PrimeNG module + import renames (TypeScript only)

Mechanical, high confidence. **Safe to run first and alone.**

```
TASK: Rename removed PrimeNG entry points in TypeScript files only.

These entry-point directories NO LONGER EXIST in primeng@20.4.0. I verified
this against the installed package:
  dropdown, calendar, inputswitch, overlaypanel, sidebar, tabview, chips, messages

Apply ONLY these five 1:1 renames. All are same-shape swaps:

| Old import path       | New import path        | Old module        | New module          | Old class    | New class    |
|-----------------------|------------------------|-------------------|---------------------|--------------|--------------|
| primeng/dropdown      | primeng/select         | DropdownModule    | SelectModule        | Dropdown     | Select       |
| primeng/calendar      | primeng/datepicker     | CalendarModule    | DatePickerModule    | Calendar     | DatePicker   |
| primeng/inputswitch   | primeng/toggleswitch   | InputSwitchModule | ToggleSwitchModule  | InputSwitch  | ToggleSwitch |
| primeng/overlaypanel  | primeng/popover        | OverlayPanelModule| PopoverModule       | OverlayPanel | Popover      |
| primeng/sidebar       | primeng/drawer         | SidebarModule     | DrawerModule        | Sidebar      | Drawer       |

DO NOT touch tabview, chips, or messages in this task. Those are structural
rewrites handled separately.

SCOPE: src/**/*.ts only. Update:
  - import statements
  - NgModule `imports:` arrays
  - `@ViewChild(...)` / `@ViewChildren(...)` type references
  - type annotations and generics using the old class names

Before you start, verify every NEW name in the table exists:
  ls node_modules/primeng/select node_modules/primeng/datepicker \
     node_modules/primeng/toggleswitch node_modules/primeng/popover \
     node_modules/primeng/drawer
  grep -ohE "declare class [A-Za-z]+" node_modules/primeng/select/*.d.ts

Find the work:
  grep -rln "primeng/dropdown\|primeng/calendar\|primeng/inputswitch\|primeng/overlaypanel\|primeng/sidebar" src/

Work through the file list one file at a time. Do not modify any HTML file.

Then run and report the output:
  npx tsc --noEmit -p tsconfig.json
```

---

## Prompt 2 — PrimeNG template selector renames (HTML only)

Mechanical, but templates are where silent breakage lives. **Run after Prompt 1 completes.**

```
TASK: Rename removed PrimeNG component selectors in templates only.

Verified against primeng@20.4.0 .d.ts files. Apply ONLY these:

| Old selector    | New selector     |
|-----------------|------------------|
| p-dropdown      | p-select         |
| p-calendar      | p-datepicker     |
| p-inputSwitch   | p-toggleswitch   |
| p-overlayPanel  | p-popover        |
| p-sidebar       | p-drawer         |

DO NOT touch p-tabView, p-tabPanel, p-chips, or p-messages. Separate task.

SCOPE: src/**/*.html only. Rename BOTH the opening and closing tag. Preserve
every attribute, binding, directive, structural directive, template ref
(#ref), pipe, and child element EXACTLY as-is. Change only the tag name.

CRITICAL — @Input and @Output names may have changed across the rename, and
that is invisible to the compiler in templates. For each file you touch, list
every attribute used on the renamed element, then verify each one against the
new component:
  grep -ohE 'InputDeclaration<[^>]+>' node_modules/primeng/select/*.d.ts
  grep -ohE 'OutputDeclaration<[^>]+>' node_modules/primeng/select/*.d.ts

Any attribute you cannot find on the new component goes in the UNVERIFIED
section of your report. DO NOT rename or delete it. DO NOT guess a
replacement. Leave it untouched and report it.

Find the work:
  grep -rln "p-dropdown\|p-calendar\|p-inputSwitch\|p-overlayPanel\|p-sidebar" src/ --include="*.html"

Process in batches of at most 10 files. After each batch:
  npm run build
Report the error count after each batch. If the count goes UP, stop
immediately and report which batch caused it.
```

---

## Prompt 3 — Structural rewrites (one component at a time)

**Do not bulk-run this. One file per Roo Code task, human review between each.**

```
TASK: Rewrite ONE file that uses a PrimeNG component removed in v20 with no
1:1 replacement. I will give you the file path. Do not search for others.

FILE: <paste one file path here>

These are NOT renames. The component structure changed:

1. p-tabView / p-tabPanel  ->  a five-element nesting:
     p-tabs > p-tablist > p-tab
     p-tabs > p-tabpanels > p-tabpanel
   Module: TabViewModule -> TabsModule (from primeng/tabs)
   Verify the real structure and inputs first:
     grep -ohE 'ComponentDeclaration<[A-Za-z]+, "[^"]+"' node_modules/primeng/tabs/*.d.ts
     grep -ohE 'InputDeclaration<[^>]+>' node_modules/primeng/tabs/*.d.ts
   Tab identity is now value-based, not index-based. If the existing code
   depends on tab INDEX (activeIndex, (onChange) reading index, programmatic
   index selection), STOP and report it — that needs a human decision about
   what the value keys should be.

2. p-chips  ->  p-autocomplete with multiple mode
   Module: ChipsModule -> AutoCompleteModule (from primeng/autocomplete)
   This changes behaviour, not just markup: AutoComplete expects a suggestion
   source. If the old p-chips was free-text entry with no suggestions, report
   what configuration you believe is needed and STOP. Do not guess.

3. p-messages  ->  p-message
   Module: MessagesModule -> MessageModule (from primeng/message)
   The old p-messages rendered an ARRAY of messages from one element.
   p-message renders a SINGLE message. Any code binding a Message[] array,
   or using MessageService with this element, needs restructuring. Describe
   the change you propose, then STOP and wait for my approval before editing.

RULES FOR THIS TASK:
- Explain your plan BEFORE editing. Wait for my go-ahead.
- Preserve every binding, event handler, form control, and ARIA attribute.
- If the component is covered by a *.spec.ts, tell me which selectors the
  spec queries so I know what will break. Do not edit the spec.
- Change nothing outside the file I named.
```

---

## Prompt 4 — Angular 20 API changes

Small and self-contained. **Safe to run in parallel with Prompt 1.**

```
TASK: Apply Angular 20 API changes. This is a small, bounded set.

1. platformBrowserDynamic -> platformBrowser
   @angular/platform-browser-dynamic is deprecated in v20 (npm deprecation:
   "Use @angular/platform-browser instead"). platformBrowser IS exported from
   @angular/platform-browser v20 — verify before editing:
     grep -n "declare const platformBrowser" node_modules/@angular/platform-browser/index.d.ts

     // before
     import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
     platformBrowserDynamic().bootstrapModule(AppModule);
     // after
     import { platformBrowser } from '@angular/platform-browser';
     platformBrowser().bootstrapModule(AppModule);

   CRITICAL: DO NOT remove @angular/platform-browser-dynamic from
   package.json. jest-preset-angular and @angular-builders/jest both
   peer-depend on it. You are not editing package.json anyway.

2. TestBed.flushEffects() -> TestBed.tick()
3. provideExperimentalZonelessChangeDetection -> provideZonelessChangeDetection
4. ng-reflect-* debug attributes are no longer emitted in dev mode in v20.
   Report any test or code that reads them. DO NOT rewrite the assertions —
   just list them.

Find the work:
  grep -rn "platformBrowserDynamic\|flushEffects\|provideExperimentalZoneless\|ng-reflect-" src/

For items 2, 3 and 4 you MAY edit *.spec.ts (this is the only prompt where
that is allowed), except for item 4 which is report-only.

Then:
  npx tsc --noEmit -p tsconfig.json
```

---

## Prompt 5 — Triage pass (report only, zero edits)

Run this when the build still fails and you want a map before deciding.

```
TASK: Diagnose only. MAKE NO EDITS. Do not create, modify, or delete any file.

Run:
  npm run build 2>&1 | tee /tmp/build.log

Then produce a report grouped by CAUSE, not by file:

## A. PrimeNG selector not recognised
Which selectors, how many occurrences, which files.

## B. PrimeNG input/output no longer exists
The binding, the component, and what node_modules/primeng says the valid
inputs are. Cite the grep output.

## C. Angular 20 API change
## D. Type errors from @angular/cdk 20
## E. Errors originating in the ng-wings library (not our source)
   These indicate ng-wings needs rebuilding against Angular 20 — flag
   loudly and separately, they are NOT fixable in this repo.
## F. Anything you cannot classify

For each group give: error count, representative error text verbatim, file
list, and your confidence (high/medium/low) that it is caused by the upgrade
rather than pre-existing.

Rank the groups by (number of files affected) x (blast radius). I want to
know what to fix first, not a list of every error.
```

---

## How to run this across your tabs

| Tab | Prompt | Notes |
|---|---|---|
| Roo Code | Prompt 1 (TS renames) | Start here |
| Roo Code (2) | Prompt 4 (Angular 20 APIs) | Parallel-safe, disjoint files |
| Roo Code (3) | Prompt 2 (HTML selectors) | **Only after Prompt 1 finishes** |
| Roo Code (4) | Prompt 3 (structural) | One file per task, review between |

Commit after each prompt completes. If Qwen goes off the rails, `git diff`
plus a single-commit revert is your escape hatch — which only works if you
commit between prompts.

## Two things to watch Qwen for

Small models fail these two ways on this specific job:

1. **Inventing PrimeNG inputs.** It will confidently write `[optionLabel]` on
   a component that renamed it. Rule 1 and the per-file grep verification in
   Prompt 2 exist specifically to catch this. If the report has an empty
   UNVERIFIED section across dozens of files, be suspicious — it probably
   skipped the verification step.

2. **Scope creep into control flow / standalone.** Angular 20 content in its
   training data is saturated with `@if` and standalone components, so it will
   drift there unprompted. If you see `@if` in a diff, revert that file.
