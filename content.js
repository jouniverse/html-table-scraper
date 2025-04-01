let currentTableIndex = 0;
let tables = [];

// Function to convert table to array of objects
function tableToArray(table) {
  const rows = table.getElementsByTagName("tr");
  const headers = [];
  const data = [];

  // Get headers from first row
  const headerRow = rows[0];
  if (headerRow) {
    const headerCells = headerRow.getElementsByTagName("th");
    if (headerCells.length > 0) {
      for (let cell of headerCells) {
        headers.push(cell.textContent.trim());
      }
    } else {
      // If no th elements, use td elements from first row
      const headerTds = headerRow.getElementsByTagName("td");
      for (let cell of headerTds) {
        headers.push(cell.textContent.trim());
      }
    }
  }

  // Get data from remaining rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.getElementsByTagName("td");
    const rowData = {};

    for (let j = 0; j < cells.length; j++) {
      const header = headers[j] || `Column ${j + 1}`;
      rowData[header] = cells[j].textContent.trim();
    }

    data.push(rowData);
  }

  return data;
}

// Function to convert data to CSV
function convertToCSV(data) {
  if (!data.length) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header] || "";
      // Escape commas and quotes in the value
      return `"${value.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

// Function to highlight the current table
function highlightTable(index) {
  // Remove previous highlights and overlays
  document.querySelectorAll(".table-scraper-highlight").forEach((el) => {
    el.classList.remove("table-scraper-highlight");
  });

  // Remove any existing overlays
  document.querySelectorAll(".table-scraper-overlay").forEach((el) => {
    el.remove();
  });

  if (tables[index]) {
    const table = tables[index];
    table.classList.add("table-scraper-highlight");

    // Create and insert overlay div
    const overlay = document.createElement("div");
    overlay.className = "table-scraper-overlay";

    // Position overlay exactly over the table
    const rect = table.getBoundingClientRect();
    overlay.style.top = window.scrollY + rect.top + "px";
    overlay.style.left = window.scrollX + rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";

    document.body.appendChild(overlay);
  }
}

// Initialize tables
function initializeTables() {
  tables = Array.from(document.getElementsByTagName("table"));
  currentTableIndex = 0;

  // Add CSS for highlighting
  const style = document.createElement("style");
  style.textContent = `
    .table-scraper-highlight {
      position: relative !important;
      outline: 3px solid #4CAF50 !important;
      outline-offset: 2px !important;
    }
    .table-scraper-overlay {
      position: absolute !important;
      background-color: rgba(76, 175, 80, 0.1) !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      box-shadow: 0 0 0 2px #4CAF50 !important;
    }
  `;
  document.head.appendChild(style);

  return tables.length;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getTableCount") {
    const count = initializeTables();
    sendResponse({ count });
  } else if (request.action === "getCurrentTable") {
    if (tables.length === 0) {
      sendResponse({ error: "No tables found" });
      return;
    }

    const table = tables[currentTableIndex];
    const data = tableToArray(table);
    const dimensions = `${table.rows.length} rows × ${
      table.rows[0]?.cells.length || 0
    } columns`;

    sendResponse({
      data,
      dimensions,
      index: currentTableIndex + 1,
      total: tables.length,
    });
  } else if (request.action === "nextTable") {
    currentTableIndex = (currentTableIndex + 1) % tables.length;
    highlightTable(currentTableIndex);
    sendResponse({ success: true });
  } else if (request.action === "download") {
    const table = tables[currentTableIndex];
    const data = tableToArray(table);
    const format = request.format;

    let content, filename;
    if (format === "csv") {
      content = convertToCSV(data);
      filename = `table_${currentTableIndex + 1}.csv`;
    } else {
      content = JSON.stringify(data, null, 2);
      filename = `table_${currentTableIndex + 1}.json`;
    }

    sendResponse({ content, filename });
  }
});
