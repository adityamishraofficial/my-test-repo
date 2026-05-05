import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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

type TinyMceWindow = Window & {
  tinymce?: TinyMceGlobal;
};

const SAMPLE_DOCUMENT = `
  <h1>Shared Multi-List Template</h1>
  <p>This shared editor keeps semantic nested lists for editing and builds explicit Preview Body HTML for DOCX and PDF preview pipelines.</p>
  <ol>
    <li>Project summary</li>
    <li>
      Review scope
      <ol style="list-style-type: upper-alpha;">
        <li>
          Legal review
          <ol style="list-style-type: lower-roman;">
            <li>Contract wording</li>
            <li>Regulatory wording</li>
          </ol>
        </li>
        <li>Operational review</li>
      </ol>
    </li>
    <li>
      Deliverables
      <ul style="list-style-type: square;">
        <li>DOCX preview payload</li>
        <li>
          PDF preview payload
          <ul style="list-style-type: circle;">
            <li>Cover page</li>
            <li>Appendix</li>
          </ul>
        </li>
      </ul>
    </li>
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
const MARKER_STYLE = ['font-weight:700', 'color:#111827'].join(';');
const CONTENT_STYLE = ['color:#1f2937'].join(';');
const PREVIEW_DATA_ATTRIBUTES = [
  'data-rendered-preview',
  'data-rendered-list',
  'data-rendered-list-kind',
  'data-rendered-list-format',
  'data-rendered-list-start',
  'data-rendered-item',
  'data-rendered-row',
  'data-rendered-marker',
  'data-rendered-content',
];
const EDITOR_MARKER_ATTRIBUTE = 'data-editor-marker';

const EDITOR_CONTENT_STYLE = `
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
  }

  body {
    margin: 0;
    padding: 20px;
    color: #1f2937;
    background: #ffffff;
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.6;
  }

  .page {
    width: min(210mm, 100%);
    min-height: 297mm;
    padding: 20mm;
    margin: auto;
    background: #ffffff;
    box-sizing: border-box;
  }

  .highlighted-var {
    background-color: rgb(253, 249, 156);
    color: #000000;
    font-weight: 700;
  }

  .copy-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    cursor: pointer;
    display: none;
  }

  .drag-content:hover .copy-btn {
    display: block !important;
  }

  .iterate {
    background: #eaa99c;
  }

  .noneditable {
    background: #a8f3e6;
  }

  .variable {
    font-weight: 700;
  }

  .transpose {
    background: rgb(212, 247, 39) !important;
  }

  .header,
  .footer {
    position: relative;
    border: 2px dotted gray;
    min-height: 100px;
    z-index: 99;
  }

  .delete-header-btn,
  .delete-footer-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    background: transparent;
    border: none;
    color: #c00;
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    z-index: 9999;
  }

  .header:hover .delete-header-btn,
  .footer:hover .delete-footer-btn {
    display: inline !important;
    -webkit-user-modify: read-only;
  }

  .header::before,
  .footer::before {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 35px;
    color: #ffea9a;
    pointer-events: none;
    z-index: -9;
    font-weight: 700;
    letter-spacing: 8px;
  }

  .header::before {
    content: "HEADER";
  }

  .footer::before {
    content: "FOOTER";
  }

  .header-placeholder,
  .footer-placeholder {
    display: block !important;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: rgb(225, 53, 53);
    font-size: 48px;
    opacity: 0.1;
    font-weight: 700;
    white-space: nowrap;
    pointer-events: none;
    -webkit-user-modify: read-only;
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
  imports: [CommonModule],
  templateUrl: './create-edit-template.component.html',
  styleUrl: './create-edit-template.component.css',
})
export class CreateEditTemplateComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly editorHost =
    viewChild.required<ElementRef<HTMLTextAreaElement>>('editorHost');

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
    try {
      await this.loadTinyMce();
      await this.initEditor();
    } catch (error) {
      console.error(error);
      this.status.set('TinyMCE failed to load');
    }

    this.destroyRef.onDestroy(() => {
      this.editor?.remove();
    });
  }

  protected resetSample(): void {
    this.editor?.setContent(SAMPLE_DOCUMENT);
    this.syncDerivedHtml(SAMPLE_DOCUMENT);
  }

  protected loadPreviewBodyIntoEditor(): void {
    if (!this.editor) {
      return;
    }

    this.editor.setContent('');
    this.editor.setContent(this.exportHtml());
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
    try {
      await navigator.clipboard.writeText(this.exportHtml());
      this.copyLabel.set('Copied');
    } catch (error) {
      console.error(error);
      this.copyLabel.set('Copy failed');
    }

    window.setTimeout(() => {
      this.copyLabel.set('Copy export HTML');
    }, 1600);
  }

  private async initEditor(): Promise<void> {
    const tinymce = this.getTinyMceGlobal();

    if (!tinymce) {
      throw new Error('TinyMCE did not finish loading.');
    }

    const [editor] = await tinymce.init({
      target: this.editorHost().nativeElement,
      height: 420,
      license_key: 'gpl',
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
          activeEditor.setContent(SAMPLE_DOCUMENT);
          this.updateEditorMarkers(activeEditor);
          this.syncDerivedHtml(SAMPLE_DOCUMENT);
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
          this.syncDerivedHtml(this.sanitizeEditorContent(activeEditor.getContent()));
        });
      },
    });

    this.editor = editor;
  }

  private getTinyMceGlobal(): TinyMceGlobal | undefined {
    return (window as TinyMceWindow).tinymce;
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
    const previewRoot = container.querySelector('[data-rendered-preview="true"]');
    const sourceRoot = previewRoot ?? container;
    const normalizedRoot = document.createElement('div');

    Array.from(sourceRoot.childNodes).forEach((node) => {
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

    const topLevelLists = Array.from(documentFragment.querySelectorAll('ol, ul')).filter(
      (list): list is HTMLOListElement | HTMLUListElement => !list.parentElement?.closest('li'),
    );

    topLevelLists.forEach((list) => {
      list.replaceWith(this.buildRenderedList(list, [], 0));
    });

    return documentFragment.innerHTML;
  }

  private convertRenderedPreviewToSemantic(root: ParentNode): void {
    const renderedLists = Array.from(root.querySelectorAll('div[data-rendered-list="true"]')).filter(
      (list) => !list.parentElement?.closest('div[data-rendered-list="true"]'),
    );

    renderedLists.forEach((renderedList) => {
      renderedList.replaceWith(this.buildSemanticListFromRendered(renderedList));
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

    root.querySelectorAll('ol, ul').forEach((list) => {
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
    const start = Number.parseInt(list.getAttribute('start') ?? '1', 10);
    renderedList.setAttribute('data-rendered-list', 'true');
    renderedList.setAttribute('data-rendered-list-kind', listKind);
    renderedList.setAttribute('data-rendered-list-format', listFormat);

    if (listKind === 'ol' && !Number.isNaN(start) && start !== 1) {
      renderedList.setAttribute('data-rendered-list-start', `${start}`);
    }

    renderedList.setAttribute('style', RENDERED_LIST_STYLE);

    const items = Array.from(list.children).filter(
      (child): child is HTMLLIElement => child.tagName === 'LI',
    );

    items.forEach((item, itemIndex) => {
      const currentNumber = Number.isNaN(start) ? itemIndex + 1 : start + itemIndex;
      const currentOrderedMarkerSegments =
        listKind === 'ol'
          ? [...parentOrderedMarkerSegments, this.formatListValue(currentNumber, listFormat)]
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

      const textIndent = document.createTextNode(PREVIEW_TEXT_INDENT_PER_LEVEL.repeat(depth));
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
    const listKind = renderedList.getAttribute('data-rendered-list-kind') === 'ul' ? 'ul' : 'ol';
    const semanticList = document.createElement(listKind) as HTMLOListElement | HTMLUListElement;
    const listFormat = renderedList.getAttribute('data-rendered-list-format');
    const listStart = renderedList.getAttribute('data-rendered-list-start');

    if (listFormat) {
      semanticList.style.listStyleType = listFormat;

      if (listKind === 'ol') {
        const htmlType = this.toHtmlListType(listFormat);

        if (htmlType) {
          semanticList.setAttribute('type', htmlType);
        }
      } else if (listFormat !== 'disc') {
        semanticList.setAttribute('type', listFormat);
      }
    }

    if (listKind === 'ol' && listStart) {
      semanticList.setAttribute('start', listStart);
    }

    const renderedItems = Array.from(renderedList.children).filter(
      (child): child is HTMLDivElement =>
        child instanceof HTMLDivElement && child.dataset['renderedItem'] === 'true',
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
            (node.dataset['renderedList'] === 'true' || node.tagName === 'OL' || node.tagName === 'UL')
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
        return (node.textContent?.trim().length ?? 0) > 0;
      }

      if (!(node instanceof HTMLElement)) {
        return false;
      }

      return (node.textContent?.trim().length ?? 0) > 0 || node.tagName === 'IMG' || node.tagName === 'BR';
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
          ? [...parentOrderedMarkerSegments, this.formatListValue(currentNumber, listFormat)]
          : parentOrderedMarkerSegments;

      if (listKind === 'ol') {
        item.setAttribute(EDITOR_MARKER_ATTRIBUTE, `${currentOrderedMarkerSegments.join('.')}.`);
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

    const inlineStyleSources = [
      list.getAttribute('data-mce-style') ?? '',
      list.getAttribute('style') ?? '',
    ];

    for (const source of inlineStyleSources) {
      const match = source.match(/list-style-type\s*:\s*([a-z-]+)/i);

      if (match?.[1]) {
        return match[1].toLowerCase();
      }
    }

    if (list.style.listStyleType) {
      return list.style.listStyleType.toLowerCase();
    }

    const type = (list.getAttribute('type') || '').trim();

    if (listKind === 'ul') {
      switch (type) {
        case 'circle':
        case 'square':
        case 'disc':
          return type;
        default:
          return 'disc';
      }
    }

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
          '\u03b1',
          '\u03b2',
          '\u03b3',
          '\u03b4',
          '\u03b5',
          '\u03b6',
          '\u03b7',
          '\u03b8',
          '\u03b9',
          '\u03ba',
          '\u03bb',
          '\u03bc',
          '\u03bd',
          '\u03be',
          '\u03bf',
          '\u03c0',
          '\u03c1',
          '\u03c3',
          '\u03c4',
          '\u03c5',
          '\u03c6',
          '\u03c7',
          '\u03c8',
          '\u03c9',
        ]);
      case 'decimal':
      default:
        return `${value}`;
    }
  }

  private formatUnorderedMarker(format: string): string {
    switch (format) {
      case 'circle':
        return '\u25e6';
      case 'square':
        return '\u25aa';
      case 'disc':
      default:
        return '\u2022';
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
    if (this.getTinyMceGlobal()) {
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
      script.src = 'https://cdn.jsdelivr.net/npm/tinymce@8/tinymce.min.js';
      script.referrerPolicy = 'origin';
      script.dataset['tinymceLoader'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load TinyMCE script.'));
      document.head.append(script);
    });
  }
}
