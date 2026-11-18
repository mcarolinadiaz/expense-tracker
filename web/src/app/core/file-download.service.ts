import { DOCUMENT, inject, Service } from '@angular/core';

/** Saves a file to the user's device through the browser's download. Tests replace it. */
@Service()
export class FileDownload {
  private readonly document = inject(DOCUMENT);

  save(content: Blob, fileName: string): void {
    const url = URL.createObjectURL(content);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
