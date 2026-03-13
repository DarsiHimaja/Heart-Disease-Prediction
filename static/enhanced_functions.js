// Enhanced functions for available parameters only

function generateAvailableParameters(test) {
  console.log('Test data:', test); // Debug log
  let html = '';
  
  // Display parameters in the exact format requested
  html += `<div class="flex justify-between py-1"><span>Age:</span><span class="font-medium">${test.age || 0}</span></div>`;
  html += `<div class="flex justify-between py-1"><span>Sex:</span><span class="font-medium">${test.sex !== undefined ? test.sex : 0} (${test.sex === 0 ? 'Female' : test.sex === 1 ? 'Male' : 'Unknown'})</span></div>`;
  html += `<div class="flex justify-between py-1"><span>Chest Pain (cp):</span><span class="font-medium">${test.cp !== undefined ? test.cp : 0} (${getChestPainType(test.cp)})</span></div>`;
  html += `<div class="flex justify-between py-1"><span>Resting BP (trestbps):</span><span class="font-medium">${test.trestbps || 0} mmHg</span></div>`;
  html += `<div class="flex justify-between py-1"><span>Cholesterol (chol):</span><span class="font-medium">${test.chol || 0} mg/dL</span></div>`;
  html += `<div class="flex justify-between py-1"><span>Fasting Blood Sugar (fbs):</span><span class="font-medium">${test.fbs !== undefined ? test.fbs : 0} (${test.fbs === 1 ? 'Yes' : 'No'})</span></div>`;
  html += `<div class="flex justify-between py-1"><span>Rest ECG (restecg):</span><span class="font-medium">${test.restecg !== undefined ? test.restecg : 0} (${getECGType(test.restecg)})</span></div>`;
  html += `<div class="flex justify-between py-1"><span>Max Heart Rate (thalach):</span><span class="font-medium">${test.thalach || 0} bpm</span></div>`;
  html += `<div class="flex justify-between py-1"><span>Exercise Angina (exang):</span><span class="font-medium">${test.exang !== undefined ? test.exang : 0} (${test.exang === 1 ? 'Yes' : 'No'})</span></div>`;
  html += `<div class="flex justify-between py-1"><span>ST Depression (oldpeak):</span><span class="font-medium">${test.oldpeak !== undefined ? test.oldpeak : 0}</span></div>`;
  html += `<div class="flex justify-between py-1"><span>ST Slope (slope):</span><span class="font-medium">${test.slope !== undefined ? test.slope : 0} (${getSlopeType(test.slope)})</span></div>`;
  html += `<div class="flex justify-between py-1"><span>Major Vessels (ca):</span><span class="font-medium">${test.ca !== undefined ? test.ca : 0}</span></div>`;
  html += `<div class="flex justify-between py-1"><span>Thalassemia (thal):</span><span class="font-medium">${test.thal !== undefined ? test.thal : 0} (${getThalType(test.thal)})</span></div>`;
  
  console.log('Generated HTML:', html); // Debug log
  return html;
}

// Helper functions for parameter display
function getChestPainType(cp) {
  const types = ['Typical Angina', 'Atypical', 'Non-anginal', 'Asymptomatic'];
  return types[cp] || 'Unknown';
}

function getECGType(restecg) {
  const types = ['Normal', 'ST-T Abnormality', 'LVH'];
  return types[restecg] || 'Unknown';
}

function getSlopeType(slope) {
  const types = ['Upsloping', 'Flat', 'Downsloping'];
  return types[slope] || 'Unknown';
}

function getThalType(thal) {
  const types = ['Unknown', 'Normal', 'Fixed Defect', 'Reversible Defect'];
  return types[thal] || 'Unknown';
}

function generateAvailableParametersForPDF(data) {
  let html = '';
  
  if (data.age !== undefined && data.age !== null && data.age !== '') {
    html += `<p><strong>Age:</strong> ${data.age}</p>`;
  }
  
  if (data.sex !== undefined && data.sex !== null && data.sex !== '') {
    const gender = data.sex === 0 ? 'Female' : data.sex === 1 ? 'Male' : null;
    if (gender) {
      html += `<p><strong>Gender:</strong> ${gender}</p>`;
    }
  }
  
  if (data.cp !== undefined && data.cp !== null && data.cp !== '') {
    const cpType = getChestPainType(data.cp);
    if (cpType !== 'N/A') {
      html += `<p><strong>Chest Pain Type:</strong> ${cpType}</p>`;
    }
  }
  
  if (data.trestbps !== undefined && data.trestbps !== null && data.trestbps !== '' && data.trestbps !== 0) {
    html += `<p><strong>Resting Blood Pressure:</strong> ${data.trestbps} mmHg</p>`;
  }
  
  if (data.chol !== undefined && data.chol !== null && data.chol !== '' && data.chol !== 0) {
    html += `<p><strong>Cholesterol:</strong> ${data.chol} mg/dL</p>`;
  }
  
  if (data.fbs !== undefined && data.fbs !== null && data.fbs !== '') {
    const fbsVal = data.fbs === 1 ? 'Yes' : 'No';
    html += `<p><strong>Fasting Blood Sugar >120 mg/dL:</strong> ${fbsVal}</p>`;
  }
  
  if (data.restecg !== undefined && data.restecg !== null && data.restecg !== '') {
    const ecgType = getECGType(data.restecg);
    if (ecgType !== 'N/A') {
      html += `<p><strong>Resting ECG:</strong> ${ecgType}</p>`;
    }
  }
  
  if (data.thalach !== undefined && data.thalach !== null && data.thalach !== '' && data.thalach !== 0) {
    html += `<p><strong>Maximum Heart Rate:</strong> ${data.thalach} bpm</p>`;
  }
  
  if (data.exang !== undefined && data.exang !== null && data.exang !== '') {
    const anginaVal = data.exang === 1 ? 'Yes' : 'No';
    html += `<p><strong>Exercise Induced Angina:</strong> ${anginaVal}</p>`;
  }
  
  if (data.oldpeak !== undefined && data.oldpeak !== null && data.oldpeak !== '' && data.oldpeak !== 0) {
    html += `<p><strong>ST Depression (Oldpeak):</strong> ${data.oldpeak}</p>`;
  }
  
  if (data.slope !== undefined && data.slope !== null && data.slope !== '') {
    const slopeType = getSlopeType(data.slope);
    if (slopeType !== 'N/A') {
      html += `<p><strong>ST Slope:</strong> ${slopeType}</p>`;
    }
  }
  
  if (data.ca !== undefined && data.ca !== null && data.ca !== '') {
    html += `<p><strong>Major Vessels (0-3):</strong> ${data.ca}</p>`;
  }
  
  if (data.thal !== undefined && data.thal !== null && data.thal !== '') {
    const thalType = getThalType(data.thal);
    if (thalType !== 'N/A') {
      html += `<p><strong>Thalassemia:</strong> ${thalType}</p>`;
    }
  }
  
  return html || '<p><em>No specific health parameters were recorded for this test.</em></p>';
}