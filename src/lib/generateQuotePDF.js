/**
 * Generates and downloads a PDF quotation using the GENOMA letterhead as a background.
 *
 * HOW IT WORKS:
 * 1. Generates the quotation content using jsPDF.
 * 2. Fetches the actual native /Letterhead.pdf from the public folder.
 * 3. Uses pdf-lib to overlay the original Letterhead.pdf with the generated jsPDF content.
 * 4. This keeps the vector quality of your Letterhead.pdf perfectly intact!
 *
 * TO CUSTOMIZE: Edit the CONFIG section below.
 * - FONT.family  → change the font for the whole document at once
 * - COLORS.*     → change any color across the whole document at once
 * - MARGINS.*    → push content up/down/left/right to fit the letterhead
 *
 * @param {object} data - The quotation object with lineItems, client_name, etc.
 */
export async function generateQuotePDF(data) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')
  const { PDFDocument } = await import('pdf-lib')

  // ==========================================
  // 🎨 CONFIG: EDIT THESE TO CUSTOMIZE
  // ==========================================

  // Letterhead PDF path (relative to the public folder)
  // Renamed to .dat because IDM aggressively intercepts .pdf files via fetch!
  const LETTERHEAD_URL = '/Letterhead.dat'

  // Page layout (A4 in mm)
  const PAGE = { width: 210, height: 297 }

  // Content margins — adjust these to fit your letterhead
  const MARGINS = {
    top: 45,       // Below the letterhead header
    bottom: 35,    // Above the letterhead footer
    left: 15,      // Left margin
    right: 15,     // Right margin
  }

  // Colors (RGB format: [R, G, B])
  const COLORS = {
    primary: [185, 28, 28],          // Brand red (labels, accents, total line)
    textDark: [27, 27, 27],          // Near-black for headings
    textMain: [40, 40, 40],          // Dark grey for body text
    textMuted: [100, 100, 100],      // Light grey for secondary text
    bgBox: [248, 248, 250],          // Background for info boxes
    discount: [220, 38, 38],         // Red for discount amounts
    divider: [200, 200, 200],        // Divider lines
  }

  // Font family — jsPDF built-in options: 'helvetica', 'times', 'courier'
  const FONT = {
    family: 'helvetica',   // ← Change this to 'times' or 'courier' if you want
  }

  // Status badge colors
  const STATUS_COLORS = {
    Draft: [107, 114, 128],    // Grey
    Sent: [37, 99, 235],       // Blue
    Accepted: [5, 150, 105],   // Green
    Rejected: [220, 38, 38],   // Red
  }

  const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.Draft

  // ==========================================
  // 📄 STEP 1: Create the jsPDF document (Content Only)
  // ==========================================

  const doc = new jsPDF()

  // ── "QUOTATION" title & quote number ──────────────────────
  let y = MARGINS.top

  doc.setFont(FONT.family, 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...COLORS.primary)
  doc.text('QUOTATION', MARGINS.left, y)

  doc.setFont(FONT.family, 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.textDark)
  doc.text(data.quote_number || 'DRAFT', PAGE.width - MARGINS.right, y, { align: 'right' })

  // ── Date, validity & status row ───────────────────────────
  y += 7
  doc.setFont(FONT.family, 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLORS.textMuted)
  const dateStr = new Date(data.created_at || data.date_created || Date.now()).toLocaleDateString()
  doc.text(`Date: ${dateStr}  |  Validity: ${data.validity_days || 30} days`, MARGINS.left, y)

  const statusText = data.status || 'Draft'
  doc.setFont(FONT.family, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...getStatusColor(statusText))
  doc.text(statusText.toUpperCase(), PAGE.width - MARGINS.right, y, { align: 'right' })

  // ── Divider ───────────────────────────────────────────────
  y += 4
  doc.setDrawColor(...COLORS.divider)
  doc.setLineWidth(0.3)
  doc.line(MARGINS.left, y, PAGE.width - MARGINS.right, y)

  // ── Billed To box ────────────────────────────────────────
  y += 7
  doc.setFillColor(...COLORS.bgBox)
  doc.roundedRect(MARGINS.left, y - 4, PAGE.width - MARGINS.left - MARGINS.right, 22, 2, 2, 'F')

  doc.setFont(FONT.family, 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.primary)
  doc.text('BILLED TO', MARGINS.left + 5, y + 1)

  doc.setFont(FONT.family, 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.textDark)
  doc.text(data.client_name || 'N/A', MARGINS.left + 5, y + 7)

  doc.setFont(FONT.family, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.textMuted)
  if (data.contact_person) { doc.text(`Attn: ${data.contact_person}`, MARGINS.left + 5, y + 12) }
  if (data.email) { doc.text(data.email, MARGINS.left + 5, y + 16) }

  if (data.address) {
    doc.setFont(FONT.family, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.textMuted)
    const addrLines = doc.splitTextToSize(data.address, 80)
    doc.text(addrLines, PAGE.width / 2, y + 7)
  }

  // ── Line items table ─────────────────────────────────────
  y += 28

  const tableData = (data.lineItems || []).map((li, i) => [
    i + 1,
    li.item_code || '',
    li.product_name || li.name || '',
    li.quantity,
    `EGP ${parseFloat(li.quoted_price || 0).toLocaleString()}`,
    li.discount_percent > 0 ? `${li.discount_percent}%` : '—',
    `EGP ${parseFloat(li.line_total || 0).toLocaleString()}`,
  ])

  doc.autoTable({
    startY: y,
    head: [['#', 'Code', 'Description', 'Qty', 'Unit Price', 'Disc.', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      font: FONT.family,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: COLORS.textMain,
      cellPadding: 2,
      font: FONT.family,
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 24 },
      2: { cellWidth: 'auto' },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'right', cellWidth: 26 },
    },
    margin: { left: MARGINS.left, right: MARGINS.right, bottom: MARGINS.bottom },
  })

  // ── Totals section ───────────────────────────────────────
  y = doc.lastAutoTable.finalY + 6

  // If totals overflow into footer, add new page
  if (y + 30 > PAGE.height - MARGINS.bottom) {
    doc.addPage()
    y = MARGINS.top
  }

  const totalsX = 130
  const totalsValX = PAGE.width - MARGINS.right

  // Subtotal
  doc.setFont(FONT.family, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.textMuted)
  doc.text('Subtotal:', totalsX, y)
  doc.text(`EGP ${(data.subtotal || 0).toLocaleString()}`, totalsValX, y, { align: 'right' })

  // Discount
  if (data.discount_percent > 0) {
    y += 6
    doc.setTextColor(...COLORS.discount)
    doc.text(`Discount (${data.discount_percent}%):`, totalsX, y)
    doc.text(`-EGP ${((data.subtotal || 0) * data.discount_percent / 100).toLocaleString()}`, totalsValX, y, { align: 'right' })
  }

  // Total with red separator line
  y += 8
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(0.5)
  doc.line(totalsX - 2, y - 3, totalsValX, y - 3)
  doc.setFont(FONT.family, 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.primary)
  doc.text('Total:', totalsX, y + 2)
  doc.text(`EGP ${(data.total || 0).toLocaleString()}`, totalsValX, y + 2, { align: 'right' })

  // ── Terms & Conditions ───────────────────────────────────
  if (data.terms_conditions) {
    y += 14

    // If terms overflow, add new page
    if (y + 20 > PAGE.height - MARGINS.bottom) {
      doc.addPage()
      y = MARGINS.top
    }

    doc.setDrawColor(...COLORS.divider)
    doc.setLineWidth(0.3)
    doc.line(MARGINS.left, y - 4, PAGE.width - MARGINS.right, y - 4)

    doc.setFont(FONT.family, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.textDark)
    doc.text('Terms & Conditions', MARGINS.left, y)

    doc.setFont(FONT.family, 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.textMuted)
    const termsLines = doc.splitTextToSize(data.terms_conditions, PAGE.width - MARGINS.left - MARGINS.right)
    doc.text(termsLines, MARGINS.left, y + 5)
  }

  // Get the generated content pages as a buffer (does not trigger a download)
  const jsPdfBuffer = doc.output('arraybuffer')

  // ==========================================
  // 📄 STEP 2: Stamp content onto the Letterhead PDF
  // ==========================================

  // We build finalBytes inside try, fall back to jsPDF buffer on error.
  // The download is triggered ONCE at the very end — no double downloads.
  let finalBytes

  try {
    // 1. Load the Base64 letterhead data directly from memory!
    // No `fetch` means IDM cannot possibly intercept anything.
    const { letterheadBase64 } = await import('./letterheadBase64')
    
    // Convert Base64 string to Uint8Array (ArrayBuffer equivalent for pdf-lib)
    const binaryString = atob(letterheadBase64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // 2. Load the Letterhead as the BASE document (it becomes our final doc)
    const finalDoc      = await PDFDocument.load(bytes)
    const contentDoc    = await PDFDocument.load(jsPdfBuffer)
    const contentPages  = contentDoc.getPageCount()

    // 3. For each content page, stamp it onto a letterhead page
    for (let i = 0; i < contentPages; i++) {
      let targetPage

      if (i === 0) {
        // First content page → stamp onto the existing letterhead page
        targetPage = finalDoc.getPages()[0]
      } else {
        // Extra pages (long quotes) → copy the letterhead page again and append
        const [extraPage] = await finalDoc.copyPages(
          await PDFDocument.load(bytes), [0]
        )
        finalDoc.addPage(extraPage)
        targetPage = finalDoc.getPages()[i]
      }

      // Embed this content page as a transparent XObject and stamp it on top
      const [contentXObj] = await finalDoc.embedPdf(contentDoc, [i])
      targetPage.drawPage(contentXObj)
    }

    finalBytes = await finalDoc.save()
  } catch (err) {
    console.warn('Letterhead merge failed — downloading content only:', err)
    finalBytes = jsPdfBuffer   // fallback: content without letterhead
  }

  // ✅ ONE single download, always
  const blob = new Blob([finalBytes], { type: 'application/pdf' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `${data.quote_number || 'Quotation'}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}


