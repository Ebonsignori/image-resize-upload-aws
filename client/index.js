/* global exifr */
const validFeedbackEl = document.querySelector("#valid-feedback");
const invalidFeedbackEl = document.querySelector("#invalid-feedback");
const imageNameEl = document.querySelector("#image-name");

const latitudeEl = document.querySelector("#latitude");
const longitudeEl = document.querySelector("#longitude");

let imageName;
let exifData = {};
let imageProcessed = false;

function resetFeedback() {
  validFeedbackEl.style.display = "none";
  invalidFeedbackEl.style.display = "none";
  validFeedbackEl.innerHTML = "";
  invalidFeedbackEl.innerHTML = "";
}

// Handle query params for post-upload status
window.onload = () => {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  const urlsContainerEl = document.querySelector("#image-urls-container");

  const urlsEl = document.querySelector("#image-urls");
  resetFeedback();
  if (params.result) {
    validFeedbackEl.innerHTML = decodeURIComponent(params.result);
    validFeedbackEl.style.display = "block";
  } else if (params.error) {
    invalidFeedbackEl.innerHTML = decodeURIComponent(params.error);
    invalidFeedbackEl.style.display = "block";
  }
  if (params.imageUrls) {
    urlsContainerEl.style.display = "block";
    const urls = JSON.parse(decodeURIComponent(params.imageUrls));
    for (const url of urls) {
      const urlListItem = document.createElement("li");
      urlListItem.innerHTML = `<a target="_blank" href="${url}">${url}</a>`;
      urlsEl.appendChild(urlListItem);
    }
  }
  // Remove params so refresh / back doesn't show message
  window.history.replaceState({}, document.title, "/");
};

// Handle upload
document.querySelector("#file-input").addEventListener("change", async (e) => {
  imageProcessed = false;
  const file = e.target.files[0];
  // Parse EXIF data
  exifData = await exifr.parse(file);
  if (!exifData) {
    exifData = {};
  }
  const exifGps = await exifr.gps(file);
  imageName = file.name.replace(/\.[^/.]+$/, "");
  imageNameEl.value = imageName;
  if (exifGps) {
    latitudeEl.value = exifGps.latitude;
    longitudeEl.value = exifGps.longitude;
  } else {
    longitudeEl.value = "";
    latitudeEl.value = "";
  }
  imageProcessed = true;
});

imageNameEl.addEventListener("change", (e) => {
  imageName = e.target.value;
});

// Append all exifr data to form on submit
const fileForm = document.querySelector("#file-form");
fileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  resetFeedback();
  if (!imageProcessed) {
    invalidFeedbackEl.innerHTML = "No image selected to upload.";
    invalidFeedbackEl.style.display = "block";
    return;
  }
  imageProcessed = false;
  if (!imageName) {
    invalidFeedbackEl.innerHTML = "Please enter an Image Name";
    invalidFeedbackEl.style.display = "block";
    return;
  }

  // Add fields to data
  exifData.ImageName = imageName;
  exifData.latitude = latitudeEl.value;
  exifData.longitude = longitudeEl.value;

  for (const entry of Object.entries(exifData)) {
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = entry[0];
    hiddenInput.value = entry[1];
    fileForm.appendChild(hiddenInput);
  }
  fileForm.submit();
  exifData = {};
});
