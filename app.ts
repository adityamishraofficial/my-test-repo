The issue is confirmed. listItem and gridItem templates were deprecated and removed in PrimeNG 17+, replaced by list and grid ￼ templates. The key change is that the new template receives the entire items array, not a single item, so you must use *ngFor inside.

Here’s the full fix for your edm-consult-docs.component.html:

Before (PrimeNG 17 — broken in 18):

<p-dataView [value]="documents" class="edm-files-list" adminSelenium="crud_frm_consultDocs">
  <p-header>
    <p class="text-center no-margin">...</p>
  </p-header>

  <ng-template let-doc pTemplate="listItem">
    <div class="document-section flex justify-content-around align-items-center p-4">
      ...
    </div>
  </ng-template>
</p-dataView>


After (PrimeNG 18 — fixed):

<p-dataView [value]="documents" class="edm-files-list" adminSelenium="crud_frm_consultDocs">

  <ng-template pTemplate="header">
    <p class="text-center no-margin">
      <span *ngIf="documents.length > 0">
        <strong>{{documents.length}}</strong>
        <span> document</span>
        <span *ngIf="documents.length > 1">s</span>
      </span>
      <span *ngIf="documents.length === 0">No documents</span>
    </p>
  </ng-template>

  <!-- ✅ "list" instead of "listItem", receives the full array -->
  <ng-template pTemplate="list" let-items>
    <div *ngFor="let doc of items">
      <div class="document-section flex justify-content-around align-items-center p-4">

        <div class="icon text-center" *ngIf="isActiveFile(doc.docState)">
          <i class="far fa-file-word fa-4x" aria-hidden="true"
             *ngIf="(doc.fileExt | uppercase) ==='DOC' || (doc.fileExt | uppercase) ==='DOCX'"></i>
          <i class="far fa-file-excel fa-4x" aria-hidden="true"
             *ngIf="(doc.fileExt | uppercase)==='XLS' || (doc.fileExt | uppercase) ==='XLSX'"></i>
          <i class="far fa-file-pdf fa-4x" aria-hidden="true"
             *ngIf="(doc.fileExt | uppercase) ==='PDF' || (doc.fileExt | uppercase) ==='DPDF'"></i>
          <i class="far fa-file-image fa-4x" aria-hidden="true"
             *ngIf="isImageFile(doc.fileExt)"></i>
        </div>

        <div class="icon text-center" *ngIf="isScanFile(doc.docState)">
          <i class="far fa-file-alt fa-4x" aria-hidden="true"></i>
          <br>
          <span [ngClass]="doc.docState.name">{{doc.docState.value}}</span>
        </div>

        <div class="details">
          <dl class="flex flex-wrap">
            <dt>Filename: </dt>
            <dd class="p-text-bold">
              <a (click)="downloadFile(doc)" adminSelenium="crud_lnk_downloadFile">{{doc.fileName}}</a>
            </dd>
            <dt>Type: </dt>
            <dd>{{doc.fileExt}}</dd>
            <dt>Creation date: </dt>
            <dd>{{doc.uploadDate | date:'mediumDate'}}</dd>
            <dt>Author: </dt>
            <dd>{{doc.createdBy}}</dd>
            <dt>Typology: </dt>
            <dd><span *ngIf="doc.documentTypology">{{doc.documentTypology.label}}</span></dd>
            <dt>Comment: </dt>
            <dd>{{doc.comment}}</dd>
          </dl>
        </div>

      </div>
    </div>
  </ng-template>

</p-dataView>


Key changes summary:

|What changed    |Old (v17)              |New (v18)                         |
|----------------|-----------------------|----------------------------------|
|Template name   |`pTemplate="listItem"` |`pTemplate="list"`                |
|Variable binding|`let-doc` (single item)|`let-items` (full array)          |
|Iteration       |Handled automatically  |Manual `*ngFor="let doc of items"`|
|Header tag      |`<p-header>`           |`<ng-template pTemplate="header">`|

The <p-header> component was also deprecated — replace it with <ng-template pTemplate="header"> to be safe in v18.
