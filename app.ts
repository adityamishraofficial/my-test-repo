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
const PREVIEW_INDENT_SPACES_PER_LEVEL = 6;
const ROW_STYLE = [
  'margin-top:0',
  'margin-right:0',
  'margin-bottom:8pt',
  'margin-left:0',
  'padding-left:0',
  'padding:0',
  'color:#1f2937',
  'line-height:1.6',
  'white-space:normal',
].join(';');
const MARKER_STYLE = [
  'font-weight:700',
  'color:#111827',
].join(';');
const CONTENT_STYLE = ['color:#1f2937'].join(';');

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
    counter-reset: item;
  }

  ol:not([data-rendered-list="true"]) ol:not([data-rendered-list="true"]) {
    margin-top: 10px;
    margin-bottom: 0;
    margin-left: 42px;
  }

  li:not([data-rendered-item="true"]) {
    position: relative;
    display: block;
    margin: 0 0 10px;
    padding-left: 88px;
  }

  li:not([data-rendered-item="true"])::before {
    position: absolute;
    left: 0;
    top: 0;
    width: 76px;
    text-align: right;
    font-weight: 700;
    color: #111827;
    counter-increment: item;
    content: counters(item, ".") ".";
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
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
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
    await this.loadTinyMce();
    await this.initEditor();

    this.destroyRef.onDestroy(() => {
      this.editor?.remove();
    });
  }

  protected resetSample(): void {
    this.editor?.setContent(SAMPLE_DOCUMENT);
    this.syncDerivedHtml(SAMPLE_DOCUMENT);
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
    const target = this.editorHost().nativeElement;
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
      toolbar:
        'undo redo | blocks | bold italic underline | numlist bullist | outdent indent | link table | code',
      block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3',
      lists_indent_on_tab: true,
      content_style: EDITOR_CONTENT_STYLE,
      setup: (activeEditor: TinyMceEditorWithEvents) => {
        activeEditor.on('init', () => {
          activeEditor.setContent(SAMPLE_DOCUMENT);
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
          this.syncDerivedHtml(activeEditor.getContent());
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
    return `<main data-rendered-preview="true" style="${DOCUMENT_SHELL_STYLE}">${numberedBody}</main>`;
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

    topLevelLists.forEach((list) => {
      list.replaceWith(this.buildRenderedList(list, []));
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
      .querySelectorAll(
        '[data-rendered-preview], [data-rendered-list], [data-rendered-item], [data-rendered-row], [data-rendered-marker], [data-rendered-content]',
      )
      .forEach((node) => {
        node.removeAttribute('data-rendered-preview');
        node.removeAttribute('data-rendered-list');
        node.removeAttribute('data-rendered-item');
        node.removeAttribute('data-rendered-row');
        node.removeAttribute('data-rendered-marker');
        node.removeAttribute('data-rendered-content');
      });

    root.querySelectorAll('[style]').forEach((node) => {
      node.removeAttribute('style');
    });
  }

  private applyBlockStyles(root: ParentNode): void {
    root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      heading.setAttribute('style', HEADING_STYLE);
    });

    root.querySelectorAll('p').forEach((paragraph) => {
      paragraph.setAttribute('style', PARAGRAPH_STYLE);
    });

    root.querySelectorAll('ol').forEach((list) => {
      list.setAttribute('style', LIST_STYLE);
    });

    root.querySelectorAll('li').forEach((item) => {
      item.setAttribute('style', LIST_ITEM_STYLE);
    });
  }

  private buildRenderedList(list: HTMLOListElement, parentNumbers: number[]): HTMLDivElement {
    const renderedList = document.createElement('div');
    renderedList.setAttribute('data-rendered-list', 'true');
    renderedList.setAttribute('style', RENDERED_LIST_STYLE);

    const start = Number.parseInt(list.getAttribute('start') ?? '1', 10);
    const items = Array.from(list.children).filter(
      (child): child is HTMLLIElement => child.tagName === 'LI',
    );

    items.forEach((item, itemIndex) => {
      const currentNumber = Number.isNaN(start) ? itemIndex + 1 : start + itemIndex;
      const currentPath = [...parentNumbers, currentNumber];
      const depth = currentPath.length - 1;
      const nestedLists = Array.from(item.children).filter(
        (child): child is HTMLOListElement => child.tagName === 'OL',
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
        '\u00a0'.repeat(depth * PREVIEW_INDENT_SPACES_PER_LEVEL),
      );

      const marker = document.createElement('strong');
      marker.setAttribute('data-rendered-marker', 'true');
      marker.setAttribute('style', MARKER_STYLE);
      marker.textContent = `${currentPath.join('.')}.`;

      const spacer = document.createTextNode('\u00a0\u00a0');
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
        renderedItem.appendChild(this.buildRenderedList(nestedList, currentPath));
      });

      renderedList.appendChild(renderedItem);
    });
    return renderedList;
  }

  private buildSemanticListFromRendered(renderedList: Element): HTMLOListElement {
    const semanticList = document.createElement('ol');

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
