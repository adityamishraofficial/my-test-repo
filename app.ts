 Yes — the issue is coming from the AutoNumeric 4.10.10 TypeScript API, not from Angular itself.

From your screenshots, the problematic code is mainly:

this.autoNumeric.update(this.getAutoNumericOptions());

and your custom wrapper around:

this.autoNumeric.set = function (
  newValue,
  options,
  saveChangeToHistory
) {
  return autoNumericSetWrapper(newValue, options, saveChangeToHistory);
};

AutoNumeric 4.10.x includes its own TypeScript definitions, and the update() / set() signatures are stricter than older versions. 

Fix

Don’t override autoNumeric.set directly. Keep AutoNumeric’s native method and wrap it separately.

Change this:

const autoNumeric = new AutoNumeric(
  this.input.nativeElement,
  this.getAutoNumericOptions()
);
const autoNumericSetWrapper = autoNumeric.set.bind(autoNumeric);
autoNumeric.set = function (newValue, options, saveChangeToHistory) {
  try {
    return autoNumericSetWrapper(newValue, options, saveChangeToHistory);
  } catch (error) {
    return autoNumericSetWrapper('');
  }
};

to:

const autoNumeric = new AutoNumeric(
  this.input.nativeElement,
  this.getAutoNumericOptions()
);
const originalSet = autoNumeric.set.bind(autoNumeric);
const setValue = (
  newValue: string | number,
  options?: AutoNumericOptions,
  saveChangeToHistory?: boolean
) => {
  try {
    return originalSet(newValue, options, saveChangeToHistory);
  } catch (error) {
    return originalSet('');
  }
};

Then wherever you were doing:

this.autoNumeric.set(value);

use:

setValue(value);

For your ngOnChanges

Your screenshot shows:

ngOnChanges(changes: SimpleChanges): void {
  if (this.autoNumeric && (changes.currencyCode || changes.autoNumericOptions)) {
    this.autoNumeric.update(this.getAutoNumericOptions());
  }
}

Use:

ngOnChanges(changes: SimpleChanges): void {
  if (
    this.autoNumeric &&
    (changes['currencyCode'] || changes['autoNumericOptions'])
  ) {
    const options = this.getAutoNumericOptions();
    this.autoNumeric.update(options);
  }
}

If getAutoNumericOptions() is currently returning a generic any, I would make it explicitly return AutoNumeric’s option type.

private getAutoNumericOptions(): AutoNumericOptions {
  return {
    ...this.getDefaultAutoNumericOptions(),
    ...this.autoNumericOptions
  };
}

If your installed autonumeric typings expose a slightly different option type name, don’t create your own interface yet — send me the exact TypeScript error shown when hovering over the red underline. I can give you the exact 4.10.10-compatible code.

Also, update() is the correct AutoNumeric API for changing options after initialization; the official docs explicitly show anElement.update({ ...options }). 

Important: AutoNumeric 4.10.10 is the current npm release, so you don’t need to downgrade just to fix this. 
