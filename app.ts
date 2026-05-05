import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  NO_ERRORS_SCHEMA,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

type TinyMceEditor = {
  execCommand: (command: string) => void;
  getBody: () => HTMLElement;
  getContent: (options?: { format?: string }) => string;
  remove: () => void;
  selection: {
    getNode: () => Node;
  };
  setContent: (content: string) => void;
};

type TinyMceEditorWithEvents = TinyMceEditor & {
  on: (event: string, cb: (event?: unknown) => void) => void;
};

type TinyMceGlobal = {
  init: (options: Record<string, unknown>) => Promise<TinyMceEditor[]>;
};

declare global {
  interface Window {
    tinymce?: TinyMceGlobal;
  }
}

const SAMPLE_DOCUMENT = `
  <h1>Multi-Level List Example</h1>
  <p>This HTML is prepared for backend DOCX and PDF preview rendering.</p>
  <ol>
    <li>Project setup</li>
    <li>
      Requirements review
      <ol>
        <li>Confirm export layout for DOCX</li>
        <li>
          Confirm export layout for PDF
          <ol>
            <li>Validate hierarchy depth</li>
            <li>Validate indentation in preview</li>
          </ol>
        </li>
      </ol>
    </li>
    <li>Backend preview payload</li>
  </ol>
`;

const DOCUMENT_SHELL_STYLE = [
  'padding:32px',
  'color:#1f2937',
  'background:#ffffff',
  "font-family:Georgia,'Times New Roman',serif",
  'font-size:12pt',
  'line-height:1.6',
].join(';');

const BODY_STYLE = ['margin:0', 'background:#ffffff', 'padding:0'].join(';');

const HEADING_STYLE = ['margin:0 0 16px', 'line-height:1.2', 'color:#111827'].join(';');
const PARAGRAPH_STYLE = ['margin:0 0 14px', 'color:#1f2937'].join(';');
const LIST_STYLE = [
  'margin:0 0 14px',
  'padding-left:0',
  'list-style:none',
  'list-style-type:none',
].join(';');
const LIST_ITEM_STYLE = [
  'display:block',
  'margin:0 0 10px',
  'padding-left:0',
  'list-style:none',
  'list-style-type:none',
].join(';');
const RENDERED_LIST_STYLE = ['margin:0 0 14px'].join(';');
const RENDERED_ITEM_STYLE = ['display:block', 'margin:0'].join(';');
const PREVIEW_INDENT_PER_LEVEL_PT = 28;
const PREVIEW_TEXT_INDENT_PER_LEVEL = '\u2003\u2003';
const ROW_STYLE = [
  'margin-top:0',
  'margin-right:0',
  'margin-bottom:8pt',
  'margin-left:0',
  'padding-top:0',
  'padding-right:0',
  'padding-bottom:0',
  'padding-left:0',
  'color:#1f2937',
  'line-height:1.6',
].join(';');
const MARKER_STYLE = [
  'font-weight:700',
  'color:#111827',
].join(';');
const CONTENT_STYLE = ['color:#1f2937'].join(';');
const PREVIEW_DATA_ATTRIBUTES = [
  'data-rendered-preview',
  'data-rendered-list',
  'data-rendered-list-kind',
  'data-rendered-list-format',
  'data-rendered-item',
  'data-rendered-row',
  'data-rendered-marker',
  'data-rendered-content',
];
const EDITOR_MARKER_ATTRIBUTE = 'data-editor-marker';

const EDITOR_CONTENT_STYLE = `
  body {
    margin: 24px;
    color: #1f2937;
    background: #ffffff;
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.6;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0 0 16px;
    color: #111827;
    line-height: 1.2;
  }

  p {
    margin: 0 0 14px;
  }

  ol:not([data-rendered-list="true"]) {
    margin: 0 0 14px;
    padding-left: 0;
    list-style: none;
  }

  ul:not([data-rendered-list="true"]) {
    margin: 0 0 14px;
    padding-left: 42px;
    list-style-position: outside;
  }

  ol:not([data-rendered-list="true"]) ol:not([data-rendered-list="true"]),
  ol:not([data-rendered-list="true"]) ul:not([data-rendered-list="true"]),
  ul:not([data-rendered-list="true"]) ol:not([data-rendered-list="true"]),
  ul:not([data-rendered-list="true"]) ul:not([data-rendered-list="true"]) {
    margin-top: 10px;
    margin-bottom: 0;
  }

  ol:not([data-rendered-list="true"]) > li:not([data-rendered-item="true"]) {
    position: relative;
    display: block;
    margin: 0 0 10px;
    padding-left: 88px;
  }

  ul:not([data-rendered-list="true"]) > li:not([data-rendered-item="true"]) {
    margin: 0 0 10px;
  }

  ol:not([data-rendered-list="true"]) > li:not([data-rendered-item="true"])::before {
    position: absolute;
    left: 0;
    top: 0;
    width: 76px;
    text-align: right;
    font-weight: 700;
    color: #111827;
    content: attr(data-editor-marker);
  }

  [data-rendered-preview="true"] {
    padding: 0 !important;
    background: transparent !important;
    color: #1f2937 !important;
  }

  [data-rendered-preview="true"] h1,
  [data-rendered-preview="true"] h2,
  [data-rendered-preview="true"] h3,
  [data-rendered-preview="true"] h4,
  [data-rendered-preview="true"] h5,
  [data-rendered-preview="true"] h6 {
    color: #111827 !important;
  }

  [data-rendered-preview="true"] p,
  [data-rendered-preview="true"] div,
  [data-rendered-preview="true"] span {
    color: inherit;
  }
`;

@Component({
  selector: 'app-create-edit-template',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './create-edit-template.component.html',
  styleUrl: './create-edit-template.component.css',
  schemas: [NO_ERRORS_SCHEMA],
})
export class CreateEditTemplateComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(UntypedFormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly editorHost = viewChild<ElementRef<HTMLTextAreaElement>>('editorHost');

  protected readonly items = [
    { icon: 'pi pi-home', route: '/' },
    { label: 'Template Management', route: '/template-management' },
    { label: 'Create' },
  ];
  protected readonly templateForm: UntypedFormGroup = this.fb.group({
    id: [null],
    name: [''],
    organisationId: [null],
    countryIds: [[] as number[]],
    languageId: [null],
    content: [SAMPLE_DOCUMENT.trim(), Validators.required],
    status: [true],
  });
  protected readonly config = null;
  protected readonly variablesGroups: unknown[] = [];
  protected readonly clauses: Array<{
    status?: string;
    title?: string;
    contentParse?: string;
  }> = [];
  protected readonly first = 0;
  protected readonly rows = 10;
  protected readonly totalRecord = 0;
  protected readonly formDirty = false;
  protected readonly editMode = false;
  protected visible = false;
  protected previewContent: SafeHtml | null = null;
  protected showClauseDetailsDialog = false;
  protected clauseDetails: {
    clauseId?: number;
    title?: string;
    conditionExpression?: { conditions?: unknown[] };
  } | null = null;
  protected savedCriteria = null;
  protected readonly status = signal('Loading TinyMCE...');
  protected readonly rawHtml = signal(SAMPLE_DOCUMENT.trim());
  protected readonly previewHtml = signal(this.buildPreviewBody(SAMPLE_DOCUMENT));
  protected readonly previewFrameHtml = signal<SafeHtml>(
    this.trustPreviewFrameHtml(this.buildPreviewBody(SAMPLE_DOCUMENT)),
  );
  protected readonly exportHtml = signal(this.buildPreviewBody(SAMPLE_DOCUMENT));
  protected readonly patchValue = signal('');
  protected readonly copyLabel = signal('Copy export HTML');

  private editor?: TinyMceEditor;

  async ngAfterViewInit(): Promise<void> {
    if (this.editorHost()) {
      await this.loadTinyMce();
      await this.initEditor();
    } else {
      this.syncDerivedHtml(this.templateForm.value.content ?? SAMPLE_DOCUMENT);
      this.status.set('Shared template loaded');
    }

    this.destroyRef.onDestroy(() => {
      this.editor?.remove();
    });
  }

  protected get templateFormControl(): any {
    return this.templateForm.controls;
  }

  protected onSubmit(): void {
    this.syncDerivedHtml(this.templateForm.value.content ?? '');
  }

  protected onEditorInit(_event: unknown): void {}

  protected onDragVariable(_event: unknown): void {}

  protected onSearchClause(_event: Event): void {}

  protected onDragClause(_event: DragEvent, _clause: unknown): void {}

  protected onLoadClauses(_event?: unknown): void {}

  protected onPreview(): void {
    this.syncDerivedHtml(this.templateForm.value.content ?? '');
    this.previewContent = this.previewFrameHtml();
    this.visible = true;
  }

  protected onCancel(): void {}

  protected onHideClauseDetailsPopup(): void {
    this.showClauseDetailsDialog = false;
  }

  protected resetSample(): void {
    const sample = SAMPLE_DOCUMENT.trim();
    this.editor?.setContent(sample);
    this.templateForm.patchValue({ content: sample }, { emitEvent: false });
    this.syncDerivedHtml(sample);
  }

  protected loadPreviewBodyIntoEditor(): void {
    const previewBody = this.exportHtml();

    if (!this.editor) {
      return;
    }

    this.editor.setContent('');
    this.editor.setContent(previewBody);
  }

  protected updatePatchValue(value: string): void {
    this.patchValue.set(value);
  }

  protected patchValueIntoEditor(): void {
    if (!this.editor) {
      return;
    }

    this.editor.setContent('');
    this.editor.setContent(this.patchValue());
  }

  protected async copyExportHtml(): Promise<void> {
    await navigator.clipboard.writeText(this.exportHtml());
    this.copyLabel.set('Copied');

    window.setTimeout(() => {
      this.copyLabel.set('Copy export HTML');
    }, 1600);
  }

  private async initEditor(): Promise<void> {
    const host = this.editorHost();

    if (!host) {
      return;
    }

    const target = host.nativeElement;
    const tinymce = window.tinymce;

    if (!tinymce) {
      throw new Error('TinyMCE did not finish loading.');
    }

    const [editor] = await tinymce.init({
      target,
      height: 340,
      menubar: 'file edit insert format tools table',
      branding: false,
      promotion: false,
      plugins: 'lists advlist link table code autoresize',
      advlist_number_styles:
        'default,lower-alpha,upper-alpha,lower-roman,upper-roman,lower-greek',
      advlist_bullet_styles: 'default,circle,square',
      toolbar:
        'undo redo | blocks | bold italic underline | numlist bullist | outdent indent | link table | code',
      block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3',
      lists_indent_on_tab: true,
      content_style: EDITOR_CONTENT_STYLE,
      extended_valid_elements: '*[*]',
      setup: (activeEditor: TinyMceEditorWithEvents) => {
        activeEditor.on('init', () => {
          const initialContent = (this.templateForm.value.content || SAMPLE_DOCUMENT).trim();
          activeEditor.setContent(initialContent);
          this.updateEditorMarkers(activeEditor);
          this.templateForm.patchValue({ content: initialContent }, { emitEvent: false });
          this.syncDerivedHtml(initialContent);
          this.status.set('Editor ready');
        });

        activeEditor.on('BeforeSetContent', (event) => {
          const payload = event as { content?: string } | undefined;

          if (!payload?.content) {
            return;
          }

          payload.content = this.normalizeEditorContent(payload.content);
        });

        activeEditor.on('keydown', (event) => {
          const keyboardEvent = event as KeyboardEvent | undefined;

          if (!keyboardEvent || keyboardEvent.key !== 'Tab' || !this.isInsideList(activeEditor)) {
            return;
          }

          keyboardEvent.preventDefault();
          activeEditor.execCommand(keyboardEvent.shiftKey ? 'Outdent' : 'Indent');
        });

        activeEditor.on('change input undo redo setcontent', () => {
          this.updateEditorMarkers(activeEditor);
          const sanitizedContent = this.sanitizeEditorContent(activeEditor.getContent());
          this.templateForm.patchValue({ content: sanitizedContent }, { emitEvent: false });
          this.syncDerivedHtml(sanitizedContent);
        });
      },
    });

    this.editor = editor;
  }

  private isInsideList(editor: TinyMceEditor): boolean {
    let node: Node | null = editor.selection.getNode();

    while (node) {
      if (node instanceof HTMLElement && node.tagName === 'LI') {
        return true;
      }

      node = node.parentNode;
    }

    return false;
  }

  private syncDerivedHtml(content: string): void {
    const normalized = content.trim();
    const previewBody = this.buildPreviewBody(normalized);
    this.rawHtml.set(normalized);
    this.previewHtml.set(previewBody);
    this.previewFrameHtml.set(this.trustPreviewFrameHtml(previewBody));
    this.exportHtml.set(previewBody);
  }

  private sanitizeEditorContent(content: string): string {
    const container = document.createElement('div');
    container.innerHTML = content;
    container.querySelectorAll(`[${EDITOR_MARKER_ATTRIBUTE}]`).forEach((node) => {
      node.removeAttribute(EDITOR_MARKER_ATTRIBUTE);
    });
    return container.innerHTML;
  }

  private normalizeEditorContent(content: string): string {
    if (!content.includes('data-rendered-preview') && !content.includes('data-rendered-list')) {
      return content;
    }

    const container = document.createElement('div');
    container.innerHTML = content;
    const renderedRoot =
      container.querySelector('[data-rendered-preview="true"]') ??
      container.querySelector('[data-rendered-list="true"]')?.parentElement;

    if (!renderedRoot) {
      return content;
    }

    const normalizedRoot = document.createElement('div');
    Array.from(renderedRoot.childNodes).forEach((node) => {
      normalizedRoot.appendChild(node.cloneNode(true));
    });

    this.convertRenderedPreviewToSemantic(normalizedRoot);
    this.stripRenderedAttributes(normalizedRoot);

    return normalizedRoot.innerHTML;
  }

  private buildPreviewBody(content: string): string {
    const numberedBody = this.buildNumberedFragment(content);
    return `<div data-rendered-preview="true" style="${DOCUMENT_SHELL_STYLE}">${numberedBody}</div>`;
  }

  private wrapPreviewBody(bodyContent: string): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Document Preview</title>
  </head>
  <body style="${BODY_STYLE}">${bodyContent}</body>
</html>`;
  }

  private trustPreviewFrameHtml(bodyContent: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.wrapPreviewBody(bodyContent));
  }

  private buildNumberedFragment(content: string): string {
    const documentFragment = document.createElement('div');
    documentFragment.innerHTML = content;

    this.applyBlockStyles(documentFragment);

    const topLevelLists = Array.from(documentFragment.querySelectorAll('ol')).filter(
      (list): list is HTMLOListElement => !list.parentElement?.closest('li'),
    );

    const topLevelUnorderedLists = Array.from(documentFragment.querySelectorAll('ul')).filter(
      (list): list is HTMLUListElement => !list.parentElement?.closest('li'),
    );

    topLevelLists.forEach((list) => {
      list.replaceWith(this.buildRenderedList(list, [], 0));
    });

    topLevelUnorderedLists.forEach((list) => {
      list.replaceWith(this.buildRenderedList(list, [], 0));
    });

    return documentFragment.innerHTML;
  }

  private convertRenderedPreviewToSemantic(root: ParentNode): void {
    const renderedLists = Array.from(root.querySelectorAll('div[data-rendered-list="true"]'));

    renderedLists.forEach((renderedList) => {
      const semanticList = this.buildSemanticListFromRendered(renderedList);
      renderedList.replaceWith(semanticList);
    });
  }

  private stripRenderedAttributes(root: ParentNode): void {
    root
      .querySelectorAll(PREVIEW_DATA_ATTRIBUTES.map((attr) => `[${attr}]`).join(', '))
      .forEach((node) => {
        PREVIEW_DATA_ATTRIBUTES.forEach((attr) => node.removeAttribute(attr));
      });
  }

  private applyBlockStyles(root: ParentNode): void {
    root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      this.mergeMissingStyles(heading as HTMLElement, HEADING_STYLE);
    });

    root.querySelectorAll('p').forEach((paragraph) => {
      this.mergeMissingStyles(paragraph as HTMLElement, PARAGRAPH_STYLE);
    });

    root.querySelectorAll('ol').forEach((list) => {
      this.mergeMissingStyles(list as HTMLElement, LIST_STYLE);
    });

    root.querySelectorAll('li').forEach((item) => {
      this.mergeMissingStyles(item as HTMLElement, LIST_ITEM_STYLE);
    });
  }

  private mergeMissingStyles(element: HTMLElement, styles: string): void {
    const defaults = document.createElement('div');
    defaults.setAttribute('style', styles);

    Array.from(defaults.style).forEach((property) => {
      if (!element.style.getPropertyValue(property)) {
        element.style.setProperty(
          property,
          defaults.style.getPropertyValue(property),
          defaults.style.getPropertyPriority(property),
        );
      }
    });
  }

  private buildRenderedList(
    list: HTMLOListElement | HTMLUListElement,
    parentOrderedMarkerSegments: string[],
    depth: number,
  ): HTMLDivElement {
    const renderedList = document.createElement('div');
    const listKind = this.getListKind(list);
    const listFormat = this.getListFormat(list);
    renderedList.setAttribute('data-rendered-list', 'true');
    renderedList.setAttribute('data-rendered-list-kind', listKind);
    renderedList.setAttribute('data-rendered-list-format', listFormat);
    renderedList.setAttribute('style', RENDERED_LIST_STYLE);

    const start = Number.parseInt(list.getAttribute('start') ?? '1', 10);
    const items = Array.from(list.children).filter(
      (child): child is HTMLLIElement => child.tagName === 'LI',
    );

    items.forEach((item, itemIndex) => {
      const currentNumber = Number.isNaN(start) ? itemIndex + 1 : start + itemIndex;
      const currentOrderedMarkerSegments =
        listKind === 'ol'
          ? [
              ...parentOrderedMarkerSegments,
              this.formatListValue(currentNumber, listFormat),
            ]
          : parentOrderedMarkerSegments;
      const markerText =
        listKind === 'ol'
          ? `${currentOrderedMarkerSegments.join('.')}.`
          : this.formatUnorderedMarker(listFormat);
      const nestedLists = Array.from(item.children).filter(
        (child): child is HTMLOListElement | HTMLUListElement =>
          child.tagName === 'OL' || child.tagName === 'UL',
      );

      nestedLists.forEach((nestedList) => nestedList.remove());
      const contentNodes = Array.from(item.childNodes);

      const renderedItem = document.createElement('div');
      renderedItem.setAttribute('data-rendered-item', 'true');
      renderedItem.setAttribute('style', RENDERED_ITEM_STYLE);

      const row = document.createElement('p');
      row.setAttribute('data-rendered-row', 'true');
      row.setAttribute(
        'style',
        `${ROW_STYLE};margin-left:${depth * PREVIEW_INDENT_PER_LEVEL_PT}pt;padding-left:${depth * PREVIEW_INDENT_PER_LEVEL_PT}pt`,
      );

      const textIndent = document.createTextNode(
        PREVIEW_TEXT_INDENT_PER_LEVEL.repeat(depth),
      );

      const marker = document.createElement('strong');
      marker.setAttribute('data-rendered-marker', 'true');
      marker.setAttribute('style', MARKER_STYLE);
      marker.textContent = markerText;

      const spacer = document.createTextNode('\u2002');
      const content = document.createElement('span');
      content.setAttribute('data-rendered-content', 'true');
      content.setAttribute('style', CONTENT_STYLE);

      if (this.hasVisibleContent(contentNodes)) {
        contentNodes.forEach((node) => content.appendChild(node));
      } else {
        content.innerHTML = '&nbsp;';
      }

      row.append(textIndent, marker, spacer, content);
      renderedItem.appendChild(row);

      nestedLists.forEach((nestedList) => {
        renderedItem.appendChild(
          this.buildRenderedList(nestedList, currentOrderedMarkerSegments, depth + 1),
        );
      });

      renderedList.appendChild(renderedItem);
    });
    return renderedList;
  }

  private buildSemanticListFromRendered(
    renderedList: Element,
  ): HTMLOListElement | HTMLUListElement {
    const listKind =
      renderedList.getAttribute('data-rendered-list-kind') === 'ul' ? 'ul' : 'ol';
    const semanticList = document.createElement(listKind) as HTMLOListElement | HTMLUListElement;
    const listFormat = renderedList.getAttribute('data-rendered-list-format');

    if (listFormat) {
      semanticList.style.listStyleType = listFormat;
      const htmlType = listKind === 'ol' ? this.toHtmlListType(listFormat) : null;

      if (htmlType) {
        semanticList.setAttribute('type', htmlType);
      }
    }

    const renderedItems = Array.from(renderedList.children).filter(
      (child): child is HTMLDivElement => child instanceof HTMLDivElement && child.dataset['renderedItem'] === 'true',
    );

    renderedItems.forEach((renderedItem) => {
      const semanticItem = document.createElement('li');
      const contentWrapper = renderedItem.querySelector(
        ':scope > [data-rendered-row="true"] [data-rendered-content="true"]',
      );

      if (contentWrapper) {
        Array.from(contentWrapper.childNodes).forEach((node) => {
          if (
            node instanceof HTMLElement &&
            (node.dataset['renderedList'] === 'true' || node.tagName === 'OL')
          ) {
            return;
          }

          semanticItem.appendChild(node.cloneNode(true));
        });
      }

      const nestedRenderedLists = Array.from(renderedItem.children).filter(
        (child): child is HTMLDivElement =>
          child instanceof HTMLDivElement && child.dataset['renderedList'] === 'true',
      );

      nestedRenderedLists.forEach((nestedRenderedList) => {
        semanticItem.appendChild(this.buildSemanticListFromRendered(nestedRenderedList));
      });

      semanticList.appendChild(semanticItem);
    });

    return semanticList;
  }

  private hasVisibleContent(nodes: Node[]): boolean {
    return nodes.some((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent?.trim().length;
      }

      if (!(node instanceof HTMLElement)) {
        return false;
      }

      return node.textContent?.trim().length || node.tagName === 'IMG' || node.tagName === 'BR';
    });
  }

  private updateEditorMarkers(editor: TinyMceEditor): void {
    const body = editor.getBody();

    body.querySelectorAll(`[${EDITOR_MARKER_ATTRIBUTE}]`).forEach((node) => {
      node.removeAttribute(EDITOR_MARKER_ATTRIBUTE);
    });

    const topLevelLists = Array.from(body.querySelectorAll('ol, ul')).filter(
      (list): list is HTMLOListElement | HTMLUListElement => !list.parentElement?.closest('li'),
    );

    topLevelLists.forEach((list) => {
      this.decorateEditorListMarkers(list, []);
    });
  }

  private decorateEditorListMarkers(
    list: HTMLOListElement | HTMLUListElement,
    parentOrderedMarkerSegments: string[],
  ): void {
    const listKind = this.getListKind(list);
    const listFormat = this.getListFormat(list);
    const start = Number.parseInt(list.getAttribute('start') ?? '1', 10);
    const items = Array.from(list.children).filter(
      (child): child is HTMLLIElement => child.tagName === 'LI',
    );

    items.forEach((item, itemIndex) => {
      const currentNumber = Number.isNaN(start) ? itemIndex + 1 : start + itemIndex;
      const currentOrderedMarkerSegments =
        listKind === 'ol'
          ? [
              ...parentOrderedMarkerSegments,
              this.formatListValue(currentNumber, listFormat),
            ]
          : parentOrderedMarkerSegments;

      if (listKind === 'ol') {
        item.setAttribute(
          EDITOR_MARKER_ATTRIBUTE,
          `${currentOrderedMarkerSegments.join('.')}.`,
        );
      }

      const nestedLists = Array.from(item.children).filter(
        (child): child is HTMLOListElement | HTMLUListElement =>
          child.tagName === 'OL' || child.tagName === 'UL',
      );

      nestedLists.forEach((nestedList) => {
        this.decorateEditorListMarkers(nestedList, currentOrderedMarkerSegments);
      });
    });
  }

  private getListKind(list: HTMLOListElement | HTMLUListElement): 'ol' | 'ul' {
    return list.tagName === 'UL' ? 'ul' : 'ol';
  }

  private getListFormat(list: HTMLOListElement | HTMLUListElement): string {
    const listKind = this.getListKind(list);
    const styleType = list.style.listStyleType || list.getAttribute('data-mce-style') || '';
    const inlineMatch = styleType.match(/list-style-type\s*:\s*([a-z-]+)/i);

    if (inlineMatch?.[1]) {
      return inlineMatch[1].toLowerCase();
    }

    const declaredStyle = list.style.listStyleType;
    if (declaredStyle) {
      return declaredStyle.toLowerCase();
    }

    if (listKind === 'ul') {
      return 'disc';
    }

    const type = (list.getAttribute('type') || '').trim();
    switch (type) {
      case 'a':
        return 'lower-alpha';
      case 'A':
        return 'upper-alpha';
      case 'i':
        return 'lower-roman';
      case 'I':
        return 'upper-roman';
      case '1':
      default:
        return 'decimal';
    }
  }

  private formatListValue(value: number, format: string): string {
    switch (format) {
      case 'lower-alpha':
        return this.toAlphabetic(value).toLowerCase();
      case 'upper-alpha':
        return this.toAlphabetic(value).toUpperCase();
      case 'lower-roman':
        return this.toRoman(value).toLowerCase();
      case 'upper-roman':
        return this.toRoman(value).toUpperCase();
      case 'lower-greek':
        return this.toAlphabetic(value, [
          'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ',
          'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
        ]);
      case 'decimal':
      default:
        return `${value}`;
    }
  }

  private formatUnorderedMarker(format: string): string {
    switch (format) {
      case 'circle':
        return '◦';
      case 'square':
        return '▪';
      case 'disc':
      default:
        return '•';
    }
  }

  private toAlphabetic(value: number, alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')): string {
    if (value <= 0) {
      return `${value}`;
    }

    let remaining = value;
    let result = '';

    while (remaining > 0) {
      remaining -= 1;
      result = alphabet[remaining % alphabet.length] + result;
      remaining = Math.floor(remaining / alphabet.length);
    }

    return result;
  }

  private toRoman(value: number): string {
    if (value <= 0) {
      return `${value}`;
    }

    const numerals: Array<[number, string]> = [
      [1000, 'M'],
      [900, 'CM'],
      [500, 'D'],
      [400, 'CD'],
      [100, 'C'],
      [90, 'XC'],
      [50, 'L'],
      [40, 'XL'],
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ];

    let remaining = value;
    let result = '';

    numerals.forEach(([amount, symbol]) => {
      while (remaining >= amount) {
        result += symbol;
        remaining -= amount;
      }
    });

    return result;
  }

  private toHtmlListType(format: string): string | null {
    switch (format) {
      case 'lower-alpha':
        return 'a';
      case 'upper-alpha':
        return 'A';
      case 'lower-roman':
        return 'i';
      case 'upper-roman':
        return 'I';
      case 'decimal':
        return '1';
      default:
        return null;
    }
  }

  private async loadTinyMce(): Promise<void> {
    if (window.tinymce) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-tinymce-loader="true"]',
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Failed to load TinyMCE script.')),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tinymce@7/tinymce.min.js';
      script.referrerPolicy = 'origin';
      script.dataset['tinymceLoader'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load TinyMCE script.'));
      document.head.append(script);
    });
  }
}
