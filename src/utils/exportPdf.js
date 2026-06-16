import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportDashboardPdf() {
  const el = document.getElementById('dashboard-content')
  if (!el) return

  const isDark = document.documentElement.classList.contains('dark')

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: isDark ? '#111827' : '#f9fafb',
    // Capture full element height, not just visible viewport
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  })

  const imgData = canvas.toDataURL('image/png')

  // A4 portrait in mm
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()   // 210
  const pageH = pdf.internal.pageSize.getHeight()  // 297

  // Scale image to fill page width
  const imgW = pageW
  const imgH = (canvas.height * pageW) / canvas.width

  // Tile across pages
  let remaining = imgH
  let yOnImg = 0

  while (remaining > 0) {
    if (yOnImg > 0) pdf.addPage()
    // position the image so the next slice aligns with the top of the page
    pdf.addImage(imgData, 'PNG', 0, -yOnImg, imgW, imgH)
    yOnImg += pageH
    remaining -= pageH
  }

  const fecha = new Date()
    .toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\//g, '-')

  pdf.save(`dashboard-eva-luz-${fecha}.pdf`)
}
