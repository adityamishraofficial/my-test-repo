Yes. I reviewed the package.json from both screenshots. You are currently on Angular 20.3.x, so you can upgrade directly from Angular 20 → Angular 21; you do not need to go through another Angular version. Angular officially recommends updating one major version at a time. 

There are a few important dependencies in your project that need to move with Angular 21.

1. What I see in your current package

You currently have approximately:

Angular                  20.3.26
Angular CLI              20.3.32
Angular Build            20.3.32
TypeScript               5.8.3
RxJS                     7.8.1
NgRx                     20.1.0
Angular ESLint            20.7.0
PrimeNG                  20.4.0
@primeuix/themes          1.2.5

The biggest immediate incompatibility is TypeScript.

Angular 21 requires:

Node.js       ^20.19.0 || ^22.12.0 || ^24.0.0
TypeScript    >=5.9.0 <6.0.0
RxJS          ^6.5.3 || ^7.4.0

Your RxJS 7.8.1 is fine, but TypeScript 5.8.3 needs to become 5.9+. 

⸻

Recommended upgrade approach

I would not manually change every Angular dependency in package.json first.

Do this in stages.

Step 1 — Create a Git branch

git checkout -b upgrade/angular-21

Then make sure your current Angular 20 application is clean:

git status

Ideally:

nothing to commit, working tree clean

⸻

Step 2 — Check Node version

Run:

node -v
npm -v

For Angular 21, I recommend using Node 22 LTS.

For example:

Node 22.x
npm 10.x/11.x

Angular 21 officially supports Node 20.19+, 22.12+, and 24+. 

If you’re already on Node 22, don’t change it.

⸻

Step 3 — First update Angular itself

From your project root:

ng update @angular/core@^21 @angular/cli@^21

This is the command Angular itself recommends for moving to the latest 21.x release. 

Don’t use:

npm install @angular/core@21

as your primary migration method.

ng update runs Angular’s migration schematics, which can automatically modify your source code/configuration when required.

⸻

Step 4 — TypeScript

After Angular update, make sure TypeScript is at least 5.9.

Your current:

"typescript": "~5.8.3"

should become something like:

"typescript": "~5.9.x"

or let Angular’s update process select the compatible version.

Angular 21 requires TypeScript >=5.9.0 <6.0.0. 

Do not jump to TypeScript 6.

⸻

Step 5 — Update NgRx

This is important because you have:

"@ngrx/component-store": "^20.1.0",
"@ngrx/effects": "^20.1.0",
"@ngrx/router-store": "^20.1.0",
"@ngrx/store": "^20.1.0",
"@ngrx/store-devtools": "^20.1.0"

Angular 21 should use NgRx 21.

Run:

ng update @ngrx/store@21

The NgRx 21 migration guide specifically recommends this and says NgRx 21 requires Angular 21, Angular CLI 21, and TypeScript 5.9. 

If your project uses the other NgRx packages, the update should bring the related packages along. If not, explicitly update them:

npm install \
  @ngrx/component-store@^21 \
  @ngrx/effects@^21 \
  @ngrx/router-store@^21 \
  @ngrx/store@^21 \
  @ngrx/store-devtools@^21

Then:

npm install

⸻

Step 6 — Angular ESLint

You currently have:

"@angular-eslint/builder": "^20.7.0",
"@angular-eslint/eslint-plugin": "^20.7.0",
"@angular-eslint/eslint-plugin-template": "^20.7.0",
"@angular-eslint/schematics": "^20.7.0",
"@angular-eslint/template-parser": "^20.7.0"

These should be moved to the Angular 21-compatible major:

ng update @angular-eslint/schematics@21

If necessary:

npm install \
  @angular-eslint/builder@^21 \
  @angular-eslint/eslint-plugin@^21 \
  @angular-eslint/eslint-plugin-template@^21 \
  @angular-eslint/schematics@^21 \
  @angular-eslint/template-parser@^21

⸻

Step 7 — PrimeNG is important in YOUR project

You currently have:

"primeng": "^20.4.0",
"primeicons": "^7.0.0",
"@primeuix/themes": "^1.2.5"

This is the part I would not blindly leave at v20.

PrimeNG follows Angular’s major-version cycle, and PrimeNG 21 is the Angular 21-compatible release. PrimeNG’s release history explicitly lists v21 support for Angular 21. 

So for an Angular 21 application, I recommend:

npm install primeng@^21 @primeuix/themes@latest primeicons@latest

However, because you’ve already had several PrimeNG migration issues in this project, I would treat PrimeNG 20 → 21 as a separate migration step rather than mixing all the changes together.

Your earlier PrimeNG 18 → 19 → 20 migration issues make this especially important.

⸻

Step 8 — Clean installation

After the package changes:

Windows CMD

rmdir /s /q node_modules
del package-lock.json
npm cache verify
npm install

PowerShell

Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm cache verify
npm install

Then:

ng version

You should see approximately:

Angular CLI: 21.x.x
Node: 22.x.x
Package Manager: npm
Angular:
  @angular/animations: 21.x.x
  @angular/common:    21.x.x
  @angular/compiler:  21.x.x
  @angular/core:      21.x.x
  @angular/forms:     21.x.x
  @angular/platform-browser: 21.x.x
  @angular/router:    21.x.x

⸻

Step 9 — Build before changing application code

Run:

ng build

Then:

npm test

And finally:

ng serve

Don’t start fixing random TypeScript/PrimeNG errors before confirming which package is actually causing them.

⸻

Your target versions

For your project, I’d aim for:

Package	Current	Target
@angular/core	20.3.26	21.x
@angular/common	20.3.26	21.x
@angular/compiler	20.3.26	21.x
@angular/forms	20.3.26	21.x
@angular/router	20.3.26	21.x
@angular/cli	20.3.32	21.x
@angular/build	20.3.32	21.x
@angular/compiler-cli	20.3.26	21.x
TypeScript	5.8.3	5.9.x
RxJS	7.8.1	7.8.1
NgRx	20.1.0	21.x
Angular ESLint	20.7.0	21.x
PrimeNG	20.4.0	21.x
PrimeIcons	7.0.0	latest compatible
@primeuix/themes	1.2.5	compatible latest

⸻

⚠️ One thing I would NOT update

You have:

"ngx-translate/core": "^16.0.0",
"ngx-translate/http-loader": "^17.0.0"

Don’t change these just because you’re upgrading Angular. First get Angular 21 building successfully.

Similarly, don’t randomly upgrade:

bootstrap
lodash
core-js
hash.js
file-saver
autonumeric
angular2-multiselect-dropdown

Those are independent dependencies.

⸻

The exact sequence I recommend

Run these one at a time, checking the result after each:

git checkout -b upgrade/angular-21
node -v
ng version

Then:

ng update @angular/core@^21 @angular/cli@^21

Then:

ng update @ngrx/store@21

Then:

ng update @angular-eslint/schematics@21

Then:

npm install

Then:

ng version

Then:

ng build

Important

Don’t manually edit all the @angular/* versions in package.json before running ng update. Your current Angular packages are already consistently on 20.x, so the migration tool is the safest route.

Also, because your project uses PrimeNG 20.4.0, I recommend doing the PrimeNG 20 → 21 migration separately after Angular 21 itself is working. PrimeNG’s v21 line is specifically the Angular 21-compatible line. 

If ng update gives you the dependency error you encountered previously, send me the complete error output. I can tell you exactly which package is blocking Angular 21 and give you the precise commands rather than using --force.
