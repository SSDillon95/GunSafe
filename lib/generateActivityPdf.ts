import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CheckEvent } from "./types";

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

export function downloadActivityPdf(events: CheckEvent[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date().toLocaleString();

  const logIns = events.filter((e) => e.event_type === "check_in").length;
  const logOuts = events.filter((e) => e.event_type === "check_out").length;

  doc.setFillColor(12, 15, 20);
  doc.rect(0, 0, pageWidth, 72, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("GunSafe Activity Report", 40, 36);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text("Detention Center Locker Log — Permanent Audit Trail", 40, 54);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(`Generated: ${generatedAt}`, pageWidth - 40, 90, { align: "right" });
  doc.text(`Total Records: ${events.length}`, 40, 90);
  doc.text(`Log Ins: ${logIns}    Log Outs: ${logOuts}`, 40, 104);

  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  autoTable(doc, {
    startY: 120,
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
      `GunSafe — Records cannot be deleted — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`GunSafe-Activity-Report-${dateStamp}.pdf`);
}