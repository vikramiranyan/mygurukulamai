# TimeTable extraction

The browser pipeline is:

1. Parent selects a child and uploads PDF/JPG/JPEG/PNG.
2. PDF files are decoded with `pdfjs-dist` and selectable text is extracted page by page.
3. Image files are sent one at a time to the OCR.space free OCR API (English model).
4. Extracted text is parsed into day/start/end/subject rows.
5. Unique class subjects are derived automatically.
6. The parent reviews and corrects the draft before confirmation.
7. Confirmed data is stored against the selected child.

OCR.space's free service has request limits and receives the selected image for processing. If a school timetable uses a complex grid whose OCR/text order is ambiguous, the review table remains the authoritative correction step.
