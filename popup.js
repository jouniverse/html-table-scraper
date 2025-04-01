document.addEventListener("DOMContentLoaded", async () => {
  const tableInfo = document.getElementById("tableInfo");
  const downloadBtn = document.getElementById("downloadBtn");
  const skipBtn = document.getElementById("skipBtn");
  const formatSelect = document.getElementById("formatSelect");

  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Initialize tables on the page
  const response = await chrome.tabs.sendMessage(tab.id, {
    action: "getTableCount",
  });

  if (response.count === 0) {
    tableInfo.textContent = "No tables found on this page.";
    downloadBtn.disabled = true;
    skipBtn.disabled = true;
    return;
  }

  // Load the first table
  await loadCurrentTable();

  // Event listeners
  downloadBtn.addEventListener("click", async () => {
    const format = formatSelect.value;
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "download",
      format,
    });

    // Create a blob and download the file
    const blob = new Blob([response.content], {
      type: format === "csv" ? "text/csv" : "application/json",
    });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: response.filename,
      saveAs: true,
    });
  });

  skipBtn.addEventListener("click", async () => {
    await chrome.tabs.sendMessage(tab.id, { action: "nextTable" });
    await loadCurrentTable();
  });
});

async function loadCurrentTable() {
  const tableInfo = document.getElementById("tableInfo");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const response = await chrome.tabs.sendMessage(tab.id, {
    action: "getCurrentTable",
  });

  if (response.error) {
    tableInfo.textContent = response.error;
    return;
  }

  tableInfo.textContent = `Table ${response.index} of ${response.total}\n${response.dimensions}`;
}
