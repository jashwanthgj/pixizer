// ==========================================
// 1. GLOBAL LOGIC (Runs on all pages)
// ==========================================

// Mobile Sidebar Toggle
const sidebar = document.getElementById('sidebar');
const openSidebar = document.getElementById('openSidebar');
const closeSidebar = document.getElementById('closeSidebar');

if (openSidebar && closeSidebar && sidebar) {
    openSidebar.addEventListener('click', () => sidebar.classList.add('active'));
    closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));
}


// ==========================================
// 2. IMAGE RESIZER LOGIC
// ==========================================

// Only run this if the 'processBtn' exists (meaning we are on the Image Resizer page)
if (document.getElementById('processBtn')) {

    // UI Elements
    const resizeMode = document.getElementById('resizeMode');
    const dimensionsBlock = document.getElementById('dimensionsBlock');
    const percentageBlock = document.getElementById('percentageBlock');

    const presetSelect = document.getElementById('preset');
    const unitSelect = document.getElementById('unitSelect');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const percentageValue = document.getElementById('percentageValue');

    const kbInput = document.getElementById('maxKb');
    const formatSelect = document.getElementById('outputFormat');
    const imageInput = document.getElementById('imageInput');
    const fileNameDisplay = document.getElementById('fileName');
    const processBtn = document.getElementById('processBtn');

    // Preview Elements
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const previewResult = document.getElementById('previewResult');
    const outputImage = document.getElementById('outputImage');
    const finalKb = document.getElementById('finalKb');
    const finalDim = document.getElementById('finalDim');
    const finalFormat = document.getElementById('finalFormat');
    const downloadBtn = document.getElementById('downloadBtn');

    // Standard Screen DPI for physical unit conversions
    const DPI = 96; 

    // Toggle between Dimensions and Percentage modes
    resizeMode.addEventListener('change', (e) => {
        if (e.target.value === 'percentage') {
            dimensionsBlock.classList.add('hidden');
            percentageBlock.classList.remove('hidden');
            presetSelect.value = 'custom'; // Reset presets
        } else {
            dimensionsBlock.classList.remove('hidden');
            percentageBlock.classList.add('hidden');
        }
    });

    // Quick Presets logic
    const presets = {
        social: { w: 1080, h: 1080 },
        hd: { w: 1280, h: 720 },
        exam: { w: 200, h: 230 }
    };

    presetSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (presets[val]) {
            unitSelect.value = 'px'; // Presets are always in pixels
            widthInput.value = presets[val].w;
            heightInput.value = presets[val].h;
        }
    });

    // Update filename text on upload
    imageInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            fileNameDisplay.textContent = this.files[0].name;
        } else {
            fileNameDisplay.textContent = 'No file chosen';
        }
    });

    // Helper: Get File Size in KB from base64 string
    function getFileSizeKB(dataUrl) {
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const padding = (dataUrl.charAt(dataUrl.length - 2) === '=') ? 2 : ((dataUrl.charAt(dataUrl.length - 1) === '=') ? 1 : 0);
        return ((base64Length * 0.75) - padding) / 1024;
    }

    // Helper: Get File Extension
    function getExtension(mime) {
        if(mime === 'image/png') return 'png';
        if(mime === 'image/webp') return 'webp';
        return 'jpg';
    }

    // MAIN PROCESS FUNCTION
    processBtn.addEventListener('click', () => {
        if (!imageInput.files || !imageInput.files[0]) {
            alert("Please select an image to upload first.");
            return;
        }

        // Change button to loading state
        processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        processBtn.style.opacity = '0.8';

        const targetKB = parseFloat(kbInput.value) || 500;
        const targetMime = formatSelect.value;
        const file = imageInput.files[0];

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                let targetW, targetH;

                // 1. Calculate Target Dimensions based on selected Mode
                if (resizeMode.value === 'percentage') {
                    const percent = parseFloat(percentageValue.value) / 100;
                    targetW = Math.round(img.width * percent);
                    targetH = Math.round(img.height * percent);
                } else {
                    // Dimension Mode
                    let inputW = parseFloat(widthInput.value) || 1080;
                    let inputH = parseFloat(heightInput.value) || 1080;
                    const unit = unitSelect.value;

                    // Convert selected units to Pixels for Canvas processing
                    if (unit === 'inch') {
                        targetW = Math.round(inputW * DPI);
                        targetH = Math.round(inputH * DPI);
                    } else if (unit === 'cm') {
                        targetW = Math.round(inputW * (DPI / 2.54));
                        targetH = Math.round(inputH * (DPI / 2.54));
                    } else if (unit === 'mm') {
                        targetW = Math.round(inputW * (DPI / 25.4));
                        targetH = Math.round(inputH * (DPI / 25.4));
                    } else {
                        // Default is pixels
                        targetW = Math.round(inputW);
                        targetH = Math.round(inputH);
                    }
                }

                // 2. Draw on Canvas
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                
                // Add white background if converting from transparent PNG to JPG/WEBP
                if (targetMime !== 'image/png') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, targetW, targetH);
                }
                ctx.drawImage(img, 0, 0, targetW, targetH);

                let dataUrl = "";
                let currentKb = 0;

                // 3. Compress to target KB
                if (targetMime === 'image/png') {
                    dataUrl = canvas.toDataURL('image/png'); // PNG is lossless, canvas can't adjust quality
                    currentKb = getFileSizeKB(dataUrl);
                } else {
                    // Binary search algorithm to find the exact best quality for target file size
                    let minQ = 0.05, maxQ = 1.0, quality = 0.92;
                    for (let i = 0; i < 8; i++) {
                        dataUrl = canvas.toDataURL(targetMime, quality);
                        currentKb = getFileSizeKB(dataUrl);
                        
                        if (currentKb <= targetKB && currentKb >= targetKB * 0.85) break;
                        if (currentKb > targetKB) maxQ = quality; 
                        else minQ = quality;
                        
                        quality = (minQ + maxQ) / 2;
                    }
                }

                // 4. Update the User Interface
                const ext = getExtension(targetMime);
                outputImage.src = dataUrl;
                finalKb.innerText = currentKb.toFixed(2) + ' KB';
                finalDim.innerText = `${targetW} x ${targetH} px`;
                finalFormat.innerText = ext.toUpperCase();
                
                downloadBtn.href = dataUrl;
                downloadBtn.download = `pixizer_converted.${ext}`;

                // Swap placeholders
                previewPlaceholder.classList.add('hidden');
                previewResult.classList.remove('hidden');

                // Restore button state
                processBtn.innerHTML = 'Process Image';
                processBtn.style.opacity = '1';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
