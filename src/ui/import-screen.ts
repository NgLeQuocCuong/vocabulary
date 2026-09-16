import type { Db } from '../storage/db.js';
import { importFile } from '../importer/import-controller.js';
import { el, showToast } from './components.js';

export interface ImportScreenProps {
  db: Db;
  onComplete: () => void;
}

export function buildImportScreen({ db, onComplete }: ImportScreenProps): HTMLElement {
  const container = el('section', { className: 'screen import-screen' });

  const title = el('h2', { text: 'Import vocabulary' });
  const subtitle = el('p', {
    className: 'text-muted',
    text: 'Upload a CSV or TSV file with columns for the front and back of each card. Thousands of rows are fine.',
  });

  const dropzone = el('div', {
    className: 'dropzone',
    attrs: { tabindex: '0', role: 'button', 'aria-label': 'Drop vocabulary file here or click to browse' },
    html: `
      <div class="dropzone-icon">📄</div>
      <div class="dropzone-text">Drop a CSV/TSV file here, or click to browse</div>
      <input type="file" id="file-input" accept=".csv,.tsv,text/csv,text/tab-separated-values" />
    `,
  });

  const fileInput = dropzone.querySelector('#file-input') as HTMLInputElement;

  const progressBar = el('div', { className: 'progress hidden' });
  const progressFill = el('div', { className: 'progress-fill' });
  const progressText = el('div', { className: 'progress-text', text: '0 / 0 rows parsed' });
  progressBar.append(progressFill, progressText);

  const summary = el('div', { className: 'import-summary hidden' });

  container.append(title, subtitle, dropzone, progressBar, summary);

  let isImporting = false;

  function startImport(file: File) {
    if (isImporting) return;
    isImporting = true;
    summary.classList.add('hidden');
    summary.innerHTML = '';
    progressBar.classList.remove('hidden');
    progressFill.style.width = '0%';

    importFile(
      db,
      file,
      {}, // Let the worker auto-map columns; UI mapper can be added later.
      {
        onProgress(parsed, valid, skipped) {
          progressText.textContent = `${valid} valid / ${parsed} parsed / ${skipped} skipped`;
          // We don't have total until complete; fill to 80% as a hint.
          progressFill.style.width = '80%';
        },
        onComplete(meta) {
          isImporting = false;
          progressFill.style.width = '100%';
          progressBar.classList.add('hidden');

          summary.innerHTML = `
            <strong>Import complete</strong>: ${meta.importedCount.toLocaleString()} cards imported
            from ${meta.fileName}. You can now study them.
          `;
          summary.classList.remove('hidden');
          showToast(`Imported ${meta.importedCount.toLocaleString()} cards`, 'success');
          onComplete();
        },
        onError(message) {
          isImporting = false;
          progressBar.classList.add('hidden');
          showToast(message, 'error');
        },
      },
    );
  }

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) startImport(file);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) startImport(file);
  });

  return container;
}
