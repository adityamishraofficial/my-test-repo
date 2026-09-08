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
