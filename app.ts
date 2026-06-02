I have an Angular 18 + PrimeNG 18 project migrated from v17. 
I need you to update ALL p-checkbox usages in my template files.

KEY BREAKING CHANGES in PrimeNG 18 for p-checkbox:

1. The `label` INPUT attribute has been REMOVED.
   - OLD: <p-checkbox label="Keep original file name" ...></p-checkbox>
   - NEW: Wrap in a flex div and use an external <label> element:
     <div class="flex items-center gap-2">
       <p-checkbox inputId="cbId" ...></p-checkbox>
       <label for="cbId">Keep original file name</label>
     </div>

2. `binary` attribute is now a boolean INPUT, not a string:
   - OLD: binary="true"
   - NEW: [binary]="true"

3. ngModel binding stays the same:
   - [(ngModel)]="someBoolean" still works

4. (click) event should be replaced with (onChange):
   - OLD: (click)="resetNewFilenameToOriginalFilename()"
   - NEW: (onChange)="resetNewFilenameToOriginalFilename()"

5. Make sure CheckboxModule (or standalone p-checkbox) 
   is imported in your module/component.

Here is my template code. Please apply ALL the above fixes 
to every p-checkbox you find:

[PASTE YOUR TEMPLATE CODE HERE]
