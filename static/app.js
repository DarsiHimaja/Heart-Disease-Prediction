// Dynamic API URL - works for both local and deployed
const API_URL = (() => {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return "http://127.0.0.1:5000"; // Local development
  } else {
    return window.location.origin; // Deployed version
  }
})();

console.log('Current hostname:', window.location.hostname);
console.log('API URL:', API_URL); // Debug log

let cachedResultsData = null; // Store results data globally

// Flash message system
function showFlash(message, type = 'info', duration = 1000) {
  const container = document.getElementById('flash-container');
  const flash = document.createElement('div');
  flash.className = `flash-message flash-${type}`;
  flash.textContent = message;
  
  container.appendChild(flash);
  
  // Show animation
  setTimeout(() => flash.classList.add('show'), 100);
  
  // Auto hide
  setTimeout(() => {
    flash.classList.remove('show');
    setTimeout(() => container.removeChild(flash), 300);
  }, duration);
}

// -------- Page switching --------
function showPage(page) {
  console.log('Switching to page:', page); // Debug log
  // Check if trying to access results without login
  if (page === 'results') {
    const email = localStorage.getItem("userEmail");
    console.log('Results page access attempt. Email:', email); // Debug log
    if (!email) {
      console.log('Access denied, redirecting to login'); // Debug log
      showFlash("🔐 Please login first to view your results.", "error");
      setTimeout(() => showPage("login"), 1200);
      return;
    }
  }
  
  document.querySelectorAll("main section").forEach(sec => sec.classList.add("hidden"));
  const el = document.getElementById(`${page}-page`);
  if (el) el.classList.remove("hidden");
  
  // Load results only when results page is accessed
  if (page === 'results') {
    loadResultsData();
  }
}

// -------- Load Results Data Only --------
async function loadResultsData() {
  const email = localStorage.getItem("userEmail");
  if (!email) return;

  const res = await fetch(`${API_URL}/predictions?email=${email}`);
  const data = await res.json();

  const container = document.getElementById("results-container");
  const noResults = document.getElementById("no-results");
  const analyticsSection = document.getElementById("analytics-section");
  const historySection = document.getElementById("history-section");

  if (!container || !noResults) return;

  container.innerHTML = "";

  if (!data.predictions || data.predictions.length === 0) {
    noResults.classList.remove("hidden");
    analyticsSection.classList.add("hidden");
    historySection.classList.add("hidden");
    return;
  }

  noResults.classList.add("hidden");
  analyticsSection.classList.remove("hidden");
  historySection.classList.remove("hidden");

  // Store data globally and create analytics charts
  cachedResultsData = data.predictions;
  createAnalyticsCharts(data.predictions);

  data.predictions.forEach(p => {
    const card = document.createElement("div");
    card.className = "glass-card p-6 rounded-xl card-shadow hover:scale-105 transition-transform";
    
    let analysisTime = "Unknown";
    if (p.created_at) {
      const date = new Date(p.created_at);
      const options = {
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      analysisTime = date.toLocaleString('en-US', options);
    }
    
    const riskColor = p.risk_level === 'High' ? 'text-red-600' : p.risk_level === 'Moderate' ? 'text-yellow-600' : 'text-green-600';
    const riskIcon = p.risk_level === 'High' ? '⚠️' : p.risk_level === 'Moderate' ? '🟡' : '✅';
    
    card.innerHTML = `
      <div class="text-center mb-4">
        <div class="text-4xl mb-2">${riskIcon}</div>
        <h3 class="text-xl font-bold ${riskColor}">${p.risk_level} Risk</h3>
        <p class="text-2xl font-bold text-gray-800 mb-2">${p.prediction_result.toFixed(1)}%</p>
      </div>
      <div class="text-center text-sm text-gray-600 mb-4">
        <p>🕐 ${analysisTime}</p>
      </div>
      <div class="flex space-x-2">
        <button onclick="viewTestDetails(${p.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex-1 font-semibold">
          🔍 View Details
        </button>
        <button onclick="deleteResult(${p.id})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          🗑️
        </button>
      </div>
    `;

    container.appendChild(card);
  });
  
  // Animate counters
  animateCounters();
}

// Global chart variables
let trendChart = null;

// -------- Create Analytics Charts --------
function createAnalyticsCharts(predictions) {
  // Destroy existing chart if it exists
  if (trendChart) {
    trendChart.destroy();
  }
  
  // Risk distribution
  const riskCounts = { Low: 0, Moderate: 0, High: 0 };
  predictions.forEach(p => riskCounts[p.risk_level]++);
  
  // Update summary stats with animation targets
  document.getElementById('total-tests').setAttribute('data-target', predictions.length);
  const avgRisk = predictions.reduce((sum, p) => sum + p.prediction_result, 0) / predictions.length;
  document.getElementById('avg-risk').setAttribute('data-target', avgRisk.toFixed(1));
  document.getElementById('latest-risk').textContent = predictions[0].risk_level;
  
  // Create Risk Distribution Cards
  const riskContainer = document.getElementById('risk-distribution');
  const total = predictions.length;
  
  const riskData = [
    { level: 'Low', count: riskCounts.Low, color: 'bg-green-500', icon: '✅', textColor: 'text-green-600' },
    { level: 'Moderate', count: riskCounts.Moderate, color: 'bg-yellow-500', icon: '🟡', textColor: 'text-yellow-600' },
    { level: 'High', count: riskCounts.High, color: 'bg-red-500', icon: '⚠️', textColor: 'text-red-600' }
  ];
  
  riskContainer.innerHTML = '';
  riskData.forEach(risk => {
    const percentage = total > 0 ? ((risk.count / total) * 100).toFixed(1) : 0;
    const card = document.createElement('div');
    card.className = 'bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/90 transition-all';
    card.innerHTML = `
      <div class="text-2xl mb-2">${risk.icon}</div>
      <div class="text-2xl font-bold ${risk.textColor} mb-1">${risk.count}</div>
      <div class="text-sm text-gray-600 mb-2">${risk.level} Risk</div>
      <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div class="${risk.color} h-2 rounded-full transition-all duration-1000" style="width: ${percentage}%"></div>
      </div>
      <div class="text-xs text-gray-500">${percentage}%</div>
    `;
    riskContainer.appendChild(card);
  });
  
  // Risk Trend Line Chart
  const trendCtx = document.getElementById('trendChart').getContext('2d');
  const sortedPredictions = [...predictions].reverse();
  
  trendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: sortedPredictions.map((p, i) => `Test ${i + 1}`),
      datasets: [{
        label: 'Risk Percentage',
        data: sortedPredictions.map(p => p.prediction_result),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          },
          grid: {
            color: 'rgba(0,0,0,0.1)'
          }
        },
        x: {
          grid: {
            color: 'rgba(0,0,0,0.1)'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// -------- Tabs for Predict Page --------
function showPredictTab(tab) {
  const manualTab = document.getElementById("manual-tab");
  const uploadTab = document.getElementById("upload-tab");
  const tabManualBtn = document.getElementById("tab-manual");
  const tabUploadBtn = document.getElementById("tab-upload");

  manualTab.classList.add("hidden");
  uploadTab.classList.add("hidden");
  tabManualBtn.classList.remove("bg-blue-600", "text-white");
  tabManualBtn.classList.add("bg-purple-500", "text-white");
  tabUploadBtn.classList.remove("bg-blue-600", "text-white");
  tabUploadBtn.classList.add("bg-purple-500", "text-white");

  if (tab === "manual") {
    manualTab.classList.remove("hidden");
    tabManualBtn.classList.remove("bg-purple-500");
    tabManualBtn.classList.add("bg-blue-600", "text-white");
  } else {
    uploadTab.classList.remove("hidden");
    tabUploadBtn.classList.remove("bg-purple-500");
    tabUploadBtn.classList.add("bg-blue-600", "text-white");
  }
}

// -------- Register User --------
async function registerUser() {
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  if (!name || !email || !password) return showFlash("❌ All fields are required!", "error");

  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await res.json();
  if (data.ok) {
    showFlash("✅ Registration successful! Please login.", "success");
    showPage("login");
  } else {
    showFlash("❌ " + (data.message || "Registration failed."), "error");
  }
}

// -------- Login User --------
async function loginUser() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include', // Important for sessions
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (data.ok) {
    // Still store in localStorage for frontend convenience
    localStorage.setItem("userEmail", email);
    if (data.user && data.user.name) {
      localStorage.setItem("userName", data.user.name);
    }
    showFlash("🎉 Welcome back! Login successful.", "success");
    document.getElementById("login-btn").classList.add("hidden");
    document.getElementById("logout-btn").classList.remove("hidden");
    showPage("predict");
  } else {
    showFlash("❌ " + (data.message || "Invalid credentials."), "error");
  }
}

// -------- Logout --------
async function logoutUser() {
  // Call server logout
  await fetch(`${API_URL}/logout`, {
    method: "POST",
    credentials: 'include'
  });
  
  // Clear localStorage
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  document.getElementById("login-btn").classList.remove("hidden");
  document.getElementById("logout-btn").classList.add("hidden");
  showFlash("👋 Logged out successfully. See you soon!", "info");
  showPage("login");
}

// -------- Check Authentication Status --------
async function checkAuthStatus() {
  try {
    const res = await fetch(`${API_URL}/check-auth`, {
      credentials: 'include'
    });
    const data = await res.json();
    
    if (data.logged_in) {
      // Update localStorage and UI
      localStorage.setItem("userEmail", data.user.email);
      if (data.user.name) {
        localStorage.setItem("userName", data.user.name);
      }
      document.getElementById("login-btn").classList.add("hidden");
      document.getElementById("logout-btn").classList.remove("hidden");
    } else {
      // Clear localStorage and UI
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      document.getElementById("login-btn").classList.remove("hidden");
      document.getElementById("logout-btn").classList.add("hidden");
    }
  } catch (error) {
    console.log('Auth check failed:', error);
  }
}

// -------- Cancel Uploaded File --------
document.getElementById("cancel-upload").addEventListener("click", () => {
  document.getElementById("ocr-file").value = "";
});

// -------- Manual Prediction --------
document.getElementById("predict-btn").addEventListener("click", async () => {
  const email = localStorage.getItem("userEmail");
  console.log('Predict button clicked. Email:', email); // Debug log
  if (!email) {
    console.log('No email found, redirecting to login'); // Debug log
    showFlash("🔐 Please login first to make predictions.", "error");
    setTimeout(() => showPage("login"), 1200);
    return;
  }

  const fields = ["age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal"];
  const data = { user_email: email };
  for (let f of fields) data[f] = parseFloat(document.getElementById(f).value) || 0;

  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await res.json();
  if (result.ok) {
    showResultBar(result.result);
    setTimeout(() => showPage("results"), 2500);
  } else {
    showFlash("❌ " + (result.message || "Prediction failed."), "error");
  }
});

// -------- OCR Upload Prediction --------
document.getElementById("ocr-btn").addEventListener("click", async () => {
  const email = localStorage.getItem("userEmail");
  console.log('OCR button clicked. Email:', email);
  
  if (!email) {
    showFlash("🔐 Please login first to upload files.", "error");
    setTimeout(() => showPage("login"), 1200);
    return;
  }

  const file = document.getElementById("ocr-file").files[0];
  console.log('Selected file:', file);
  
  if (!file) {
    showFlash("📁 Please select a file first!", "error");
    return;
  }

  // Show loading state
  const ocrBtn = document.getElementById("ocr-btn");
  const originalText = ocrBtn.textContent;
  ocrBtn.textContent = "🔄 Scanning...";
  ocrBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_email", email);
    
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

    console.log('Sending OCR request to:', `${API_URL}/ocr`);
    const res = await fetch(`${API_URL}/ocr`, { 
      method: "POST", 
      body: formData 
    });
    
    console.log('Response status:', res.status);
    console.log('Response headers:', res.headers);
    
    const data = await res.json();
    console.log('Response data:', data);

    if (data.ok && data.result) {
      // Fill form fields with extracted data
      if (data.extracted) {
        console.log('Extracted data:', data.extracted);
        Object.keys(data.extracted).forEach(key => {
          const element = document.getElementById(key);
          if (element) {
            element.value = data.extracted[key];
            // Highlight filled fields
            element.style.backgroundColor = '#e0f2fe';
            setTimeout(() => {
              element.style.backgroundColor = '';
            }, 3000);
          }
        });
      }
      
      const extractedInfo = Object.entries(data.extracted || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      
      // Debug: Show what was actually read from file
      if (data.file_content) {
        console.log('File content read:', data.file_content);
      }
      
      showFlash(`🔍 File scanned successfully! Prediction: ${data.result.risk_level} Risk (${data.result.prediction_result.toFixed(1)}%)`, "success", 1000);
      
      // Show the prediction result
      showResultBar(data.result);
      
      // Clear the file input
      document.getElementById("ocr-file").value = "";
      
      // Switch back to manual tab to show filled data
      showPredictTab('manual');
      
    } else {
      console.error('OCR Error:', data);
      let errorMessage = data.message || "Unknown error";
      
      // Show specific error messages for deployment limitations
      if (errorMessage.includes("not supported in this deployment")) {
        showFlash("⚠️ " + errorMessage + " Try using a simple text file instead.", "error", 5000);
      } else {
        showFlash("❌ Failed to scan: " + errorMessage, "error");
      }
    }
  } catch (error) {
    console.error('OCR Processing Error:', error);
    showFlash("❌ Error processing file: " + error.message, "error");
  } finally {
    // Reset button state
    ocrBtn.textContent = originalText;
    ocrBtn.disabled = false;
  }
});

// -------- Animated Result Bar --------
function showResultBar(result) {
  const fill = document.getElementById("progress-fill");
  const box = document.getElementById("prediction-result");
  const label = document.getElementById("risk-label");
  const status = document.getElementById("risk-status");

  if (!fill || !box || !label || !status) {
    console.error('Result elements not found');
    return;
  }

  box.classList.remove("hidden");
  fill.style.width = "0%";
  fill.className = "progress-fill"; // Reset classes

  const percent = result.prediction_result;
  const level = result.risk_level;

  label.textContent = `Risk Level: ${level} (${percent.toFixed(1)}%)`;
  
  setTimeout(() => {
    fill.style.width = `${Math.min(percent, 100)}%`;
    
    // Add risk-specific classes
    if (level === "High") {
      fill.classList.add("high-risk");
    } else if (level === "Moderate") {
      fill.classList.add("medium-risk");
    }
  }, 300);

  status.textContent =
    level === "High" ? "⚠️ High Risk - Consult a Doctor" :
    level === "Moderate" ? "🟡 Moderate Risk - Monitor Health" :
    "✅ Low Risk - Maintain Healthy Habits";
    
  // Scroll to result
  setTimeout(() => {
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 500);
}

// -------- Load Results with Date --------
async function loadResults() {
  showPage("results");
}

// -------- Delete Prediction --------
async function deleteResult(id) {
  await fetch(`${API_URL}/delete/${id}`, { method: "DELETE" });
  cachedResultsData = null; // Clear cache
  loadResultsData();
}

// -------- Check Login Status on Page Load --------
document.addEventListener('DOMContentLoaded', function() {
  // Check server-side authentication status
  checkAuthStatus();
  
  // Debug: Log current login status
  const email = localStorage.getItem("userEmail");
  console.log('Login status:', email ? 'Logged in as ' + email : 'Not logged in');
});

// -------- Enhanced Analytics Functions --------
function animateCounters() {
  const counters = document.querySelectorAll('.counter');
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-target'));
    const increment = target / 50;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        counter.textContent = counter.id === 'avg-risk' ? target + '%' : target;
        clearInterval(timer);
      } else {
        counter.textContent = counter.id === 'avg-risk' ? Math.floor(current) + '%' : Math.floor(current);
      }
    }, 30);
  });
}

// -------- View Test Details --------
function viewTestDetails(testId) {
  const test = cachedResultsData.find(p => p.id === testId);
  if (!test) return;
  
  const modal = document.getElementById('test-details-modal');
  const content = document.getElementById('test-details-content');
  
  let analysisTime = "Unknown";
  if (test.created_at) {
    const date = new Date(test.created_at);
    analysisTime = date.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }
  
  const riskColor = test.risk_level === 'High' ? 'text-red-600' : 
                   test.risk_level === 'Moderate' ? 'text-yellow-600' : 'text-green-600';
  const riskBg = test.risk_level === 'High' ? 'bg-red-50' : 
                 test.risk_level === 'Moderate' ? 'bg-yellow-50' : 'bg-green-50';
  
  content.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Risk Summary -->
      <div class="${riskBg} p-6 rounded-xl">
        <h3 class="text-xl font-bold ${riskColor} mb-4">🎯 Risk Assessment</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="font-medium">Risk Level:</span>
            <span class="${riskColor} font-bold">${test.risk_level}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-medium">Risk Probability:</span>
            <span class="font-bold">${test.prediction_result.toFixed(1)}%</span>
          </div>
          <div class="flex justify-between">
            <span class="font-medium">Test Date:</span>
            <span class="text-gray-600">${analysisTime}</span>
          </div>
        </div>
      </div>
      
      <!-- Available Health Parameters -->
      <div class="bg-blue-50 p-6 rounded-xl">
        <h3 class="text-xl font-bold text-blue-600 mb-4">📊 Available Health Parameters</h3>
        <div class="grid grid-cols-1 gap-2 text-sm">
          ${generateAvailableParameters(test)}
        </div>
      </div>
    </div>
    
    <!-- Recommendations -->
    <div class="mt-6 p-6 bg-gray-50 rounded-xl">
      <h3 class="text-xl font-bold text-gray-800 mb-4">💡 Recommendations</h3>
      <div class="space-y-2 text-gray-700">
        ${getRecommendations(test.risk_level)}
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
  window.currentTestData = test; // Store for PDF generation
}

function closeTestDetails() {
  document.getElementById('test-details-modal').classList.add('hidden');
}

function getChestPainType(cp) {
  const types = ['Typical Angina', 'Atypical', 'Non-anginal', 'Asymptomatic'];
  return types[cp] || 'N/A';
}

function getECGType(restecg) {
  const types = ['Normal', 'ST-T Abnormality', 'LVH'];
  return types[restecg] || 'N/A';
}

function getSlopeType(slope) {
  const types = ['Upsloping', 'Flat', 'Downsloping'];
  return types[slope] || 'N/A';
}

function getThalType(thal) {
  const types = ['N/A', 'Normal', 'Fixed Defect', 'Reversible Defect'];
  return types[thal] || 'N/A';
}

function getRecommendations(riskLevel) {
  if (riskLevel === 'High') {
    return `
      <p>• <strong>Immediate medical consultation recommended</strong></p>
      <p>• Schedule comprehensive cardiac evaluation</p>
      <p>• Monitor blood pressure and cholesterol regularly</p>
      <p>• Consider lifestyle modifications under medical supervision</p>
    `;
  } else if (riskLevel === 'Moderate') {
    return `
      <p>• Regular health check-ups every 6 months</p>
      <p>• Maintain healthy diet and exercise routine</p>
      <p>• Monitor cardiovascular risk factors</p>
      <p>• Consider stress management techniques</p>
    `;
  } else {
    return `
      <p>• Continue maintaining healthy lifestyle</p>
      <p>• Annual health check-ups recommended</p>
      <p>• Keep up regular physical activity</p>
      <p>• Maintain balanced diet and healthy weight</p>
    `;
  }
}

// -------- PDF Download Functions --------
function downloadReport() {
  const result = {
    risk_level: document.getElementById('risk-label').textContent,
    prediction_result: parseFloat(document.getElementById('risk-label').textContent.match(/\d+\.\d+/)[0]),
    timestamp: new Date().toLocaleString()
  };
  generatePDF(result, 'current');
}

function downloadTestReport() {
  if (window.currentTestData) {
    generatePDF(window.currentTestData, 'detailed');
  }
}

function generatePDF(data, type) {
  // Create a simple HTML content for PDF
  const content = `
    <html>
    <head>
      <title>Heart Health Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .risk-high { color: #dc2626; }
        .risk-moderate { color: #d97706; }
        .risk-low { color: #059669; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>❤️ Heart Health Assessment Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="section">
        <h2>Risk Assessment</h2>
        <p><strong>Risk Level:</strong> <span class="risk-${data.risk_level?.toLowerCase()}">${data.risk_level}</span></p>
        <p><strong>Risk Probability:</strong> ${data.prediction_result?.toFixed(1)}%</p>
        ${data.created_at ? `<p><strong>Test Date:</strong> ${data.created_at}</p>` : ''}
      </div>
      
      ${type === 'detailed' ? `
      <div class="section">
        <h2>Available Health Parameters</h2>
        ${generateAvailableParametersForPDF(data)}
      </div>
      ` : ''}
      
      <div class="section">
        <h2>Recommendations</h2>
        ${getRecommendations(data.risk_level).replace(/•/g, '').replace(/<[^>]*>/g, '')}
      </div>
      
      <div class="section">
        <p><em>Disclaimer: This report is for informational purposes only and should not replace professional medical advice.</em></p>
      </div>
    </body>
    </html>
  `;
  
  // Create and download the PDF
  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `heart-health-report-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showFlash('📄 Report downloaded successfully!', 'success');
}