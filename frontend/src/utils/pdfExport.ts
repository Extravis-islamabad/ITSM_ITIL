import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// SupportX brand colors
const SUPPORTX_PURPLE = [139, 92, 246];
const SUPPORTX_PURPLE_DARK = [107, 33, 168];

export const exportReportToPDF = async (reportData: any, reportType: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Try to load logo
  let logoLoaded = false;
  let logoImg: HTMLImageElement | null = null;

  try {
    // Try to load logo from public folder
    const response = await fetch('/logo.png');
    if (response.ok) {
      const blob = await response.blob();
      const reader = new FileReader();
      logoImg = await new Promise((resolve) => {
        reader.onload = () => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = reader.result as string;
        };
        reader.readAsDataURL(blob);
      });
      if (logoImg) logoLoaded = true;
    }
  } catch {
    // Logo loading failed, continue without logo
  }

  // HEADER with logo and report title
  const addHeader = () => {
    // Purple header background - taller for better proportions
    doc.setFillColor(SUPPORTX_PURPLE[0], SUPPORTX_PURPLE[1], SUPPORTX_PURPLE[2]);
    doc.rect(0, 0, pageWidth, 36, 'F');

    // Accent line
    doc.setFillColor(SUPPORTX_PURPLE_DARK[0], SUPPORTX_PURPLE_DARK[1], SUPPORTX_PURPLE_DARK[2]);
    doc.rect(0, 36, pageWidth, 3, 'F');

    // Logo (if loaded) - properly sized without compression
    let textStartX = 14;
    if (logoLoaded && logoImg) {
      try {
        // Larger logo with proper aspect ratio
        doc.addImage(logoImg, 'PNG', 12, 5, 28, 28);
        textStartX = 46;
      } catch {
        // If adding image fails, continue without it
      }
    }

    // Report title only (no extra text next to logo)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${reportType} Report`, textStartX, 20);

    // Date info on right side only
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 14, { align: 'right' });
    if (reportData.start_date && reportData.end_date) {
      doc.text(`Period: ${reportData.start_date} to ${reportData.end_date}`, pageWidth - 14, 22, { align: 'right' });
    }
  };
  
  // FOOTER
  const addFooter = (pageNum: number) => {
    doc.setFillColor(250, 245, 255);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${pageNum}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  };
  
  let yPos = 46;

  addHeader();
  
  // EXECUTIVE SUMMARY SECTION
  doc.setFillColor(245, 243, 255);
  doc.rect(14, yPos, pageWidth - 28, 8, 'F');
  doc.setTextColor(107, 33, 168);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('EXECUTIVE SUMMARY', 18, yPos + 6);
  
  yPos += 15;
  
  // Summary Metrics in a grid
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  const metrics = [
    { label: 'Total Tickets', value: reportData.total_tickets || 0, color: [59, 130, 246] },
    { label: 'Resolved', value: reportData.resolved_tickets || 0, color: [16, 185, 129] },
    { label: 'Resolution Rate', value: `${reportData.resolution_rate?.toFixed(1) || 0}%`, color: [168, 85, 247] },
    { label: 'Avg Resolution', value: `${reportData.avg_resolution_hours?.toFixed(1) || 0}h`, color: [245, 158, 11] },
    { label: 'SLA Compliance', value: `${reportData.sla_compliance?.toFixed(1) || 100}%`, color: [139, 92, 246] },
    { label: 'SLA Breached', value: reportData.sla_breached || 0, color: [239, 68, 68] },
  ];
  
  let xPos = 14;
  metrics.forEach((metric, index) => {
    if (index > 0 && index % 3 === 0) {
      yPos += 25;
      xPos = 14;
    }
    
    // Metric card
    doc.setFillColor(metric.color[0], metric.color[1], metric.color[2], 0.1);
    doc.roundedRect(xPos, yPos, 60, 20, 3, 3, 'F');
    
    doc.setDrawColor(metric.color[0], metric.color[1], metric.color[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(xPos, yPos, 60, 20, 3, 3, 'S');
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(metric.label, xPos + 4, yPos + 6);
    
    doc.setTextColor(metric.color[0], metric.color[1], metric.color[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(String(metric.value), xPos + 4, yPos + 15);
    doc.setFont('helvetica', 'normal');
    
    xPos += 63;
  });
  
  yPos += 30;
  
  // TICKET VOLUME SECTION
  if (reportData.volumeData && reportData.volumeData.length > 0) {
    yPos += 5;
    doc.setFillColor(245, 243, 255);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setTextColor(107, 33, 168);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TICKET VOLUME ANALYSIS', 18, yPos + 6);
    
    yPos += 12;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Created', 'Resolved', 'Closed']],
      body: reportData.volumeData.map((day: any) => [
        day.date,
        day.created,
        day.resolved,
        day.closed,
      ]),
      theme: 'grid',
      headStyles: { 
        fillColor: [139, 92, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [250, 245, 255] },
      margin: { left: 14, right: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // AGENT PERFORMANCE SECTION
  if (reportData.agents && reportData.agents.length > 0) {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
      addHeader();
      yPos = 45;
    }
    
    yPos += 5;
    doc.setFillColor(245, 243, 255);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setTextColor(107, 33, 168);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AGENT PERFORMANCE', 18, yPos + 6);
    
    yPos += 12;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Agent', 'Assigned', 'Resolved', 'Resolution Rate', 'Avg Time', 'SLA Compliance']],
      body: reportData.agents.map((agent: any) => [
        agent.agent_name,
        agent.total_assigned,
        agent.resolved,
        `${agent.resolution_rate.toFixed(1)}%`,
        `${agent.avg_resolution_hours}h`,
        `${agent.sla_compliance.toFixed(1)}%`,
      ]),
      theme: 'grid',
      headStyles: { 
        fillColor: [139, 92, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [250, 245, 255] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 50 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // CATEGORY ANALYSIS
  if (reportData.categories && reportData.categories.length > 0) {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
      addHeader();
      yPos = 45;
    }
    
    yPos += 5;
    doc.setFillColor(245, 243, 255);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setTextColor(107, 33, 168);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CATEGORY BREAKDOWN', 18, yPos + 6);
    
    yPos += 12;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Total Tickets', 'Avg Resolution Time']],
      body: reportData.categories.map((cat: any) => [
        cat.category,
        cat.total,
        `${cat.avg_resolution_hours}h`,
      ]),
      theme: 'grid',
      headStyles: { 
        fillColor: [139, 92, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [250, 245, 255] },
      margin: { left: 14, right: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // SLA COMPLIANCE SECTION
  if (reportData.slaData?.by_priority && reportData.slaData.by_priority.length > 0) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
      addHeader();
      yPos = 45;
    }
    
    yPos += 5;
    doc.setFillColor(245, 243, 255);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setTextColor(107, 33, 168);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SLA COMPLIANCE BY PRIORITY', 18, yPos + 6);
    
    yPos += 12;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Priority', 'Total', 'Breached', 'Compliance']],
      body: reportData.slaData.by_priority.map((sla: any) => [
        sla.priority,
        sla.total,
        sla.breached,
        `${sla.compliance.toFixed(1)}%`,
      ]),
      theme: 'grid',
      headStyles: { 
        fillColor: [139, 92, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [250, 245, 255] },
      margin: { left: 14, right: 14 },
    });
  }
  
  // Add footers to all pages
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(i);
  }
  
  // Save with branded filename
  const filename = `SupportX_${reportType}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};