// Compatibility checker with static fallback for GitHub Pages
async function checkCompatibility() {
    // Get form values
    const cpuBrand = document.getElementById('cpuBrand').value;
    const cpuModel = document.getElementById('cpuModel').value;
    const motherboard = document.getElementById('motherboard').value;
    const graphicsCard = document.getElementById('graphicsCard').value;

    // Validate inputs
    if (!cpuBrand || !cpuModel || !motherboard || !graphicsCard) {
        showError("Please fill in all fields to check compatibility.");
        return;
    }

    // Show loading state
    const resultDiv = document.getElementById('compatibilityResult');
    resultDiv.innerHTML = `
        <div class="p-6 border border-primary border-opacity-50 rounded-lg bg-primary bg-opacity-5">
            <div class="flex items-center">
                <div class="w-6 h-6 border-t-2 border-b-2 border-primary rounded-full animate-spin mr-3"></div>
                <p>Analyzing hardware compatibility...</p>
            </div>
        </div>
    `;
    resultDiv.classList.remove('hidden');

    try {
        // Construct the prompt for analysis
        const hardwareInfo = `CPU Brand: ${cpuBrand}\nCPU Model: ${cpuModel}\nMotherboard: ${motherboard}\nGraphics Card: ${graphicsCard}`;
        
        let data;
        
        // Try to detect if we're on GitHub Pages or a static host
        const isStaticHost = window.location.hostname.includes('github.io') || 
                             !window.location.hostname.includes('localhost');
        
        if (isStaticHost) {
            // Use static compatibility checking logic for GitHub Pages
            data = getStaticCompatibilityResult(cpuBrand, cpuModel, motherboard, graphicsCard);
            
            // Add a small delay to simulate processing
            await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
            // For local development or servers that support API calls
            const prompt = `As a Hackintosh expert, evaluate if this hardware configuration would work well as a Hackintosh:
    ${hardwareInfo}
    
    Please analyze:
    1. Overall compatibility (Excellent/Good/Limited/Poor)
    2. Known issues or limitations
    3. Recommended macOS versions that would work best
    4. Any specific configuration tips
    
    Format your response as JSON with these fields:
    - compatibility (string): "Excellent", "Good", "Limited", or "Poor"
    - issues (array of strings): List of potential issues
    - recommendedVersions (array of strings): List of recommended macOS versions
    - tips (array of strings): List of configuration tips
    - summary (string): Brief overall assessment`;
    
            // Call the OpenAI API through our proxy
            const response = await fetch('/api/openai-compatibility', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt })
            });
    
            if (!response.ok) {
                throw new Error('API request failed');
            }
    
            data = await response.json();
        }
        
        // Display the result
        displayCompatibilityResult(data);
    } catch (error) {
        console.error('Error checking compatibility:', error);
        
        // Fallback to static assessment even if API call fails
        const data = getStaticCompatibilityResult(cpuBrand, cpuModel, motherboard, graphicsCard);
        displayCompatibilityResult(data);
    }
}

// Static compatibility assessment function for GitHub Pages
function getStaticCompatibilityResult(cpuBrand, cpuModel, motherboard, graphicsCard) {
    // Convert everything to lowercase for easier comparison
    const cpu = cpuModel.toLowerCase();
    const mobo = motherboard.toLowerCase();
    const gpu = graphicsCard.toLowerCase();
    
    let compatibility = "Limited";
    let issues = [];
    let recommendedVersions = ["macOS Monterey", "macOS Big Sur"];
    let tips = [];
    let summary = "Based on static analysis, your hardware may work with some configuration.";
    
    // Check CPU compatibility
    if (cpuBrand === "Intel") {
        if (cpu.includes("i5") || cpu.includes("i7") || cpu.includes("i9")) {
            if (cpu.includes("10") || cpu.includes("11") || cpu.includes("12") || 
                cpu.includes("8") || cpu.includes("9")) {
                compatibility = "Good";
                recommendedVersions = ["macOS Sonoma", "macOS Ventura", "macOS Monterey"];
                summary = "Your Intel CPU is well-supported in Hackintosh builds.";
            } else if (cpu.includes("6") || cpu.includes("7")) {
                compatibility = "Good";
                recommendedVersions = ["macOS Monterey", "macOS Big Sur", "macOS Catalina"];
                summary = "Your Intel CPU is supported, but newer macOS versions may have limitations.";
            } else if (cpu.includes("3") || cpu.includes("4") || cpu.includes("5")) {
                compatibility = "Limited";
                recommendedVersions = ["macOS Catalina", "macOS Mojave", "macOS High Sierra"];
                issues.push("Older Intel CPUs have limited compatibility with newer macOS versions");
                summary = "Your CPU is aging but can still work with older macOS versions.";
            }
        }
    } else if (cpuBrand === "AMD") {
        if (cpu.includes("ryzen")) {
            if (cpu.includes("5") || cpu.includes("7") || cpu.includes("9")) {
                compatibility = "Good";
                recommendedVersions = ["macOS Sonoma", "macOS Ventura", "macOS Monterey"];
                issues.push("Some applications that use Apple's Hypervisor framework may not work correctly");
                summary = "Your Ryzen CPU is well-supported, but some virtualization features may not work.";
            } else {
                compatibility = "Limited";
                issues.push("Older AMD CPUs require special patches");
                summary = "Your AMD CPU will need specific patches for compatibility.";
            }
        } else {
            compatibility = "Poor";
            issues.push("Pre-Ryzen AMD CPUs have very limited macOS support");
            summary = "Your AMD CPU may not be suitable for a Hackintosh build.";
        }
    }
    
    // Check graphics card compatibility
    if (gpu.includes("rx 5") || gpu.includes("rx 6") || gpu.includes("rx 580") || 
        gpu.includes("rx 570") || gpu.includes("rx 560") || gpu.includes("rx 550")) {
        compatibility = compatibility === "Poor" ? "Limited" : compatibility;
        tips.push("AMD Radeon cards offer native support in macOS");
    } else if (gpu.includes("nvidia")) {
        if (gpu.includes("gtx 10") || gpu.includes("rtx")) {
            issues.push("Modern NVIDIA GPUs are not supported in recent macOS versions");
            tips.push("Consider replacing your NVIDIA GPU with an AMD card for better compatibility");
            compatibility = "Poor";
            summary = "Your NVIDIA GPU is not compatible with recent macOS versions.";
        } else {
            issues.push("Older NVIDIA GPUs require additional drivers and are limited to macOS High Sierra");
            tips.push("Install NVIDIA web drivers for older macOS versions");
            compatibility = "Limited";
        }
    }
    
    // Check motherboard compatibility
    if (mobo.includes("z390") || mobo.includes("z490") || mobo.includes("z590") || 
        mobo.includes("b450") || mobo.includes("b550") || mobo.includes("x570")) {
        tips.push("Your motherboard is commonly used in Hackintosh builds");
    } else if (mobo.includes("h110") || mobo.includes("h310") || mobo.includes("b360")) {
        tips.push("Your motherboard should work but may need specific BIOS settings");
    }
    
    // Add general tips
    tips.push("Follow a detailed guide for your specific hardware combination");
    tips.push("Use OpenCore as your bootloader for the best compatibility");
    
    return {
        compatibility: compatibility,
        issues: issues,
        recommendedVersions: recommendedVersions,
        tips: tips,
        summary: summary
    };
}

function displayCompatibilityResult(data) {
    const resultDiv = document.getElementById('compatibilityResult');
    
    // Create compatibility rating display
    let compatibilityClass = 'text-yellow-600';
    let compatibilityIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    
    if (data.compatibility === 'Excellent') {
        compatibilityClass = 'text-green-600';
        compatibilityIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (data.compatibility === 'Good') {
        compatibilityClass = 'text-blue-600';
        compatibilityIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (data.compatibility === 'Poor') {
        compatibilityClass = 'text-red-600';
        compatibilityIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    }

    // Build the HTML content
    let html = `
        <div class="p-6 border border-primary border-opacity-50 rounded-lg bg-primary bg-opacity-5">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    ${compatibilityIcon}
                </div>
                <div class="ml-3">
                    <h3 class="text-lg font-bold ${compatibilityClass}">Compatibility: ${data.compatibility}</h3>
                    <p class="text-neutral-mid mt-1">${data.summary}</p>
                    
                    <div class="mt-4">
                        <h4 class="font-bold mb-2">Recommended macOS Versions:</h4>
                        <ul class="list-disc list-inside text-neutral-mid">
    `;
    
    // Add recommended versions
    data.recommendedVersions.forEach(version => {
        html += `<li>${version}</li>`;
    });
    
    html += `
                        </ul>
                    </div>
    `;
    
    // Add potential issues if there are any
    if (data.issues && data.issues.length > 0) {
        html += `
                    <div class="mt-4">
                        <h4 class="font-bold mb-2">Potential Issues:</h4>
                        <ul class="list-disc list-inside text-neutral-mid">
        `;
        
        data.issues.forEach(issue => {
            html += `<li>${issue}</li>`;
        });
        
        html += `
                        </ul>
                    </div>
        `;
    }
    
    // Add configuration tips
    if (data.tips && data.tips.length > 0) {
        html += `
                    <div class="mt-4">
                        <h4 class="font-bold mb-2">Configuration Tips:</h4>
                        <ul class="list-disc list-inside text-neutral-mid">
        `;
        
        data.tips.forEach(tip => {
            html += `<li>${tip}</li>`;
        });
        
        html += `
                        </ul>
                    </div>
        `;
    }
    
    // Add CTA buttons
    html += `
                    <div class="mt-6">
                        <a href="#products" class="inline-block bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors mr-3">
                            View Recommended EFI Packages
                        </a>
                        <button onclick="resetCompatibilityCheck()" class="inline-block border border-primary text-primary font-bold py-2 px-4 rounded-lg hover:bg-primary hover:text-white transition-colors">
                            Check Another Configuration
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    resultDiv.innerHTML = html;
    resultDiv.classList.remove('hidden');
    
    // Scroll to result
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetCompatibilityCheck() {
    // Hide result
    document.getElementById('compatibilityResult').classList.add('hidden');
    
    // Clear form
    document.getElementById('compatibilityForm').reset();
    
    // Focus on first field
    document.getElementById('cpuBrand').focus();
}

function showError(message) {
    const resultDiv = document.getElementById('compatibilityResult');
    resultDiv.innerHTML = `
        <div class="p-6 border border-red-300 rounded-lg bg-red-50">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <div class="ml-3">
                    <h3 class="text-lg font-bold text-red-600">Error</h3>
                    <p class="text-neutral-mid mt-1">${message}</p>
                    <button onclick="resetCompatibilityCheck()" class="mt-4 text-primary font-bold">
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    `;
    resultDiv.classList.remove('hidden');
}