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
