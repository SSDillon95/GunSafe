import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CheckEvent } from "./types";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 36 36">
  <rect width="36" height="36" rx="8" fill="#141a24" stroke="#3b82f6" stroke-width="1.5"/>
  <rect x="8" y="10" width="20" height="16" rx="2" fill="none" stroke="#3b82f6" stroke-width="2"/>
  <circle cx="24" cy="18" r="2.5" fill="#60a5fa"/>
  <path d="M8 26h20" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

function formatReportTime(iso: string): string {
  const normalized = iso.includes("T") ? iso : iso.replace(" ", "T");
  return new Date(normalized).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function loadLogoDataUrl(): Promise<string> {
  const svgBlob = new Blob([LOGO_SVG], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 72;
    canvas.height = 72;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, 72, 72);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadActivityPdf(events: CheckEvent[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date().toLocaleString();

  const logIns = events.filter((e) => e.event_type === "check_in").length;
  const logOuts = events.filter((e) => e.event_type === "check_out").length;

  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = await loadLogoDataUrl();
  } catch {
    logoDataUrl = null;
  }

  doc.setFillColor(12, 15, 20);
  doc.rect(0, 0, pageWidth, 80, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 36, 20, 40, 40);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("GunSafe Activity Report", 88, 38);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text("Detention Center Locker Log — Permanent Audit Trail", 88, 56);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(`Generated: ${generatedAt}`, pageWidth - 40, 98, { align: "right" });
  doc.text(`Total Records: ${events.length}`, 40, 98);
  doc.text(`Log Ins: ${logIns}    Log Outs: ${logOuts}`, 40, 112);

  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  autoTable(doc, {
    startY: 128,
    head: [["Date & Time", "Event", "Officer", "Badge #", "Locker"]],
    body: sorted.map((e) => [
      formatReportTime(e.recorded_at),
      e.event_type === "check_in" ? "Log In" : "Log Out",
      e.officer_name,
      e.badge_number,
      e.locker_number,
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 8,
      lineColor: [220, 225, 235],
      lineWidth: 0.5,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 64, 120],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 70 },
      2: { cellWidth: 150 },
      3: { cellWidth: 70 },
      4: { cellWidth: 60 },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const value = data.cell.raw as string;
        if (value === "Log In") {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = "bold";
        } else if (value === "Log Out") {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: 40, right: 40 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 150);
    doc.text(
      `GunSafe Detention Center — Records cannot be deleted — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`GunSafe-Activity-Report-${dateStamp}.pdf`);
}