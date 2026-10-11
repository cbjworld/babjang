# 식권디자이너 Studio UI

## References reviewed on 2026-10-12

- [Farm Minerals](https://www.cssdesignawards.com/sites/farm-minerals/50091): CSSDA Website of the Day, 2026-09-16; WOTM September. Its green product framing informed the studio's olive accent.
- [Lidar Drone Scanning](https://www.cssdesignawards.com/sites/lidar-drone-scanning/50090): CSSDA Website of the Day, 2026-09-11. Its light, spacious product presentation informed the clear canvas framing.
- [September 2026 collection](https://www.cssdesignawards.com/blog/website-of-the-month-2026-september/438/): official award collection and preview images used for visual comparison.

These are visual references, with original CSS and layout written for the existing editor.

## UI changes

- Cream background, olive actions, small monospace captions and quiet borders.
- Three columns above 1100px; two columns on tablets; canvas first on phones.
- Basic information and design tabs, with keyboard navigation and labeled inputs.
- Text/image creation beside the canvas; PDF and print actions above properties.
- Fit the complete ticket to both available width and height and update on resize.
- Preserve ticket color tokens inside preview canvases, independently of UI colors.
- Nonblocking template-save status and padded A4 preview width calculation.

## Validation

Browser checks confirmed desktop presentation at the default 1264px viewport and phone presentation at 390px. The phone document had equal client and scroll widths (375px, excluding the scrollbar), with the complete ticket inside its canvas. Checked live department/name/phone input, information/design tabs, horizontal shape, text insertion and selected-element properties, two-person preview, five-page by-number preview and local template persistence. JavaScript syntax and `git diff --check` passed.

Browser automation timed out during direct PDF-download verification. The existing print/PDF generation functions and page-plan logic are unchanged; an end-to-end PDF download and physical printing remain to be checked before production release.
