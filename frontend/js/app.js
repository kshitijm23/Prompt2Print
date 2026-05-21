// Where the backend lives. Change this when you deploy.
const API_URL = "http://127.0.0.1:8000";

const promptEl = document.getElementById("prompt");
const btn = document.getElementById("generate-btn");
const statusEl = document.getElementById("status");
const preview = document.getElementById("preview");
const pdfFrame = document.getElementById("pdf-frame");
const downloadLink = document.getElementById("download-link");

btn.addEventListener("click", generateWorksheet);

async function generateWorksheet() {
  const prompt = promptEl.value.trim();
  if (!prompt) {
    statusEl.textContent = "Please describe the worksheet you want.";
    return;
  }

  // Lock the UI while working.
  btn.disabled = true;
  statusEl.textContent = "Generating your worksheet... this can take 20-40 seconds.";
  preview.classList.add("hidden");

  try {
    const response = await fetch(API_URL + "/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt }),
    });

    if (!response.ok) {
      // Backend returns the error log as text on failure.
      const errorText = await response.text();
      statusEl.textContent = "Could not generate the worksheet. Please try rephrasing.";
      console.error("Server error:", errorText);
      return;
    }

    // Success: the response is a PDF blob.
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    pdfFrame.src = url;
    downloadLink.href = url;
    preview.classList.remove("hidden");
    statusEl.textContent = "Done! Preview below.";
  } catch (err) {
    statusEl.textContent = "Could not reach the server. Is the backend running?";
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}
