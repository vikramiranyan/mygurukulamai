# TimeTable extraction

The browser pipeline is:

1. Parent selects a child and uploads PDF/JPG/JPEG/PNG.
2. PDF files are decoded with `pdfjs-dist` and selectable text is extracted page by page.
3. Image files are OCR'd locally in the browser with `tesseract.js` (English model).
4. Extracted text is parsed into day/start/end/subject rows.
5. Unique class subjects are derived automatically.
6. The parent reviews and corrects the draft before confirmation.
7. Confirmed data is stored against the selected child.

No server-side upload is required for this extraction path. If a school timetable uses a complex grid whose OCR/text order is ambiguous, the review table remains the authoritative correction step.
