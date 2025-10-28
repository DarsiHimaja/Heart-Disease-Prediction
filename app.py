from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3
import joblib
import numpy as np
import os
import hashlib
import random
import re

app = Flask(__name__)
CORS(app)

# ---------- Database ----------
def init_db():
    conn = sqlite3.connect("heart.db")
    c = conn.cursor()
    
    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    email TEXT UNIQUE,
                    password TEXT
                )''')
    
    # Predictions table
    c.execute('''CREATE TABLE IF NOT EXISTS predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT,
                    risk_level TEXT,
                    prediction_result REAL
                )''')
    
    # Add created_at column if it doesn't exist
    try:
        c.execute("ALTER TABLE predictions ADD COLUMN created_at DATETIME")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Add health parameter columns if they don't exist
    health_columns = [
        "age INTEGER", "sex INTEGER", "cp INTEGER", "trestbps INTEGER", "chol INTEGER",
        "fbs INTEGER", "restecg INTEGER", "thalach INTEGER", "exang INTEGER",
        "oldpeak REAL", "slope INTEGER", "ca INTEGER", "thal INTEGER"
    ]
    
    for column in health_columns:
        try:
            c.execute(f"ALTER TABLE predictions ADD COLUMN {column}")
        except sqlite3.OperationalError:
            pass  # Column already exists
    
    conn.commit()
    conn.close()

init_db()

# ---------- Load Model ----------
model = joblib.load("heart_model.pkl")
scaler = joblib.load("scaler.pkl")

# ---------- Helper: Hash password ----------
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# ---------- Routes ----------
@app.route("/")
def home():
    return render_template("index.html")

# ---------- Register ----------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not all([name, email, password]):
        return jsonify({"ok": False, "message": "All fields are required"}), 400

    conn = sqlite3.connect("heart.db")
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                  (name, email, hash_password(password)))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"ok": False, "message": "Email already registered"}), 400
    conn.close()
    return jsonify({"ok": True, "message": "Registered successfully"})

# ---------- Login ----------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    conn = sqlite3.connect("heart.db")
    c = conn.cursor()
    c.execute("SELECT password FROM users WHERE email=?", (email,))
    user = c.fetchone()
    conn.close()

    if user and user[0] == hash_password(password):
        return jsonify({"ok": True, "message": "Login successful"})
    return jsonify({"ok": False, "message": "Invalid credentials"}), 401

# ---------- Predict ----------
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    email = data.get("user_email")

    values = [
        data.get("age", 0), data.get("sex", 0), data.get("cp", 0),
        data.get("trestbps", 0), data.get("chol", 0), data.get("fbs", 0),
        data.get("restecg", 0), data.get("thalach", 0), data.get("exang", 0),
        data.get("oldpeak", 0), data.get("slope", 0), data.get("ca", 0),
        data.get("thal", 0)
    ]

    print(f"Manual input values: {values}")  # Debug print
    
    arr = np.array([values])
    arr = scaler.transform(arr)
    pred = model.predict_proba(arr)[0][1] * 100
    
    print(f"Manual prediction: {pred}%")  # Debug print

    risk = "Low" if pred < 35 else "Moderate" if pred < 65 else "High"

    conn = sqlite3.connect("heart.db")
    c = conn.cursor()
    c.execute("""INSERT INTO predictions (email, risk_level, prediction_result, created_at, age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal) 
                 VALUES (?, ?, ?, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
              (email, risk, pred, data.get("age", 0), data.get("sex", 0), data.get("cp", 0), data.get("trestbps", 0), 
               data.get("chol", 0), data.get("fbs", 0), data.get("restecg", 0), data.get("thalach", 0), 
               data.get("exang", 0), data.get("oldpeak", 0), data.get("slope", 0), data.get("ca", 0), data.get("thal", 0)))
    conn.commit()
    conn.close()

    return jsonify({"ok": True, "result": {"risk_level": risk, "prediction_result": pred}})

# ---------- Get Predictions ----------
@app.route("/predictions")
def predictions():
    email = request.args.get("email")
    conn = sqlite3.connect("heart.db")
    c = conn.cursor()
    c.execute("SELECT * FROM predictions WHERE email=? ORDER BY id DESC", (email,))
    rows = []
    for r in c.fetchall():
        # If no timestamp, use a fixed time based on ID to avoid changing times
        timestamp = r[4] if len(r) > 4 and r[4] else f"2024-01-{(r[0] % 30) + 1:02d} 07:{(r[0] % 60):02d}:00"
        rows.append({
            "id": r[0], "email": r[1], "risk_level": r[2], "prediction_result": r[3], "created_at": timestamp,
            "age": r[5] if len(r) > 5 and r[5] is not None else 0,
            "sex": r[6] if len(r) > 6 and r[6] is not None else 0,
            "cp": r[7] if len(r) > 7 and r[7] is not None else 0,
            "trestbps": r[8] if len(r) > 8 and r[8] is not None else 0,
            "chol": r[9] if len(r) > 9 and r[9] is not None else 0,
            "fbs": r[10] if len(r) > 10 and r[10] is not None else 0,
            "restecg": r[11] if len(r) > 11 and r[11] is not None else 0,
            "thalach": r[12] if len(r) > 12 and r[12] is not None else 0,
            "exang": r[13] if len(r) > 13 and r[13] is not None else 0,
            "oldpeak": r[14] if len(r) > 14 and r[14] is not None else 0,
            "slope": r[15] if len(r) > 15 and r[15] is not None else 0,
            "ca": r[16] if len(r) > 16 and r[16] is not None else 0,
            "thal": r[17] if len(r) > 17 and r[17] is not None else 0
        })
    conn.close()
    return jsonify({"predictions": rows})

# ---------- Delete Prediction ----------
@app.route("/delete/<int:id>", methods=["DELETE"])
def delete(id):
    conn = sqlite3.connect("heart.db")
    c = conn.cursor()
    c.execute("DELETE FROM predictions WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ---------- Debug File Content ----------
@app.route("/debug-file", methods=["POST"])
def debug_file():
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({"error": "No file"})
        
        # Read file content directly
        content = file.read().decode('utf-8', errors='ignore')
        file.seek(0)  # Reset file pointer
        
        return jsonify({
            "filename": file.filename,
            "content": content,
            "length": len(content)
        })
    except Exception as e:
        return jsonify({"error": str(e)})

# ---------- OCR Implementation ----------
@app.route("/ocr", methods=["POST"])
def ocr():
    try:
        file = request.files.get('file')
        email = request.form.get('user_email')
        
        if not file or not email:
            return jsonify({"ok": False, "message": "File and email required"}), 400
        
        # Save file temporarily to read properly
        filename = f"temp_{email}_{file.filename}"
        filepath = os.path.join("uploads", filename)
        os.makedirs("uploads", exist_ok=True)
        file.save(filepath)
        
        # Read file based on extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        content = ""
        
        if file_ext == '.txt':
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        elif file_ext == '.docx':
            try:
                import docx
                doc = docx.Document(filepath)
                # Extract text from paragraphs and tables
                paragraphs = [paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()]
                
                # Also extract from tables if any
                table_text = []
                for table in doc.tables:
                    for row in table.rows:
                        for cell in row.cells:
                            if cell.text.strip():
                                table_text.append(cell.text.strip())
                
                content = '\n'.join(paragraphs + table_text)
            except ImportError:
                content = "DOCX file detected but python-docx not installed"
            except Exception as e:
                content = f"Error reading DOCX: {str(e)}"
        elif file_ext == '.pdf':
            try:
                import PyPDF2
                with open(filepath, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    content = '\n'.join([page.extract_text() for page in reader.pages])
            except ImportError:
                content = "PDF file detected but PyPDF2 not installed"
        else:
            # Try as text file
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        
        print(f"=== FILE: {file.filename} ({file_ext}) ===")
        print(f"Content length: {len(content)}")
        print(f"First 500 chars: {content[:500]}")
        print(f"=== END CONTENT ===")
        
        # Clean up temp file
        try:
            os.remove(filepath)
        except:
            pass
        
        # Extract data from content
        if not content.strip():
            return jsonify({"ok": False, "message": "Could not read file content. Please ensure it's a text file, PDF, or Word document."}), 400
            
        extracted_data = parse_medical_text(content)
        
        if extracted_data:
            # Fill missing values with defaults only for prediction
            defaults = {
                "age": 50, "sex": 1, "cp": 0, "trestbps": 120, "chol": 200,
                "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
                "oldpeak": 1.0, "slope": 1, "ca": 0, "thal": 1
            }
            
            # Create prediction values (extracted + defaults for missing)
            prediction_values = []
            for field in ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"]:
                if field in extracted_data:
                    prediction_values.append(extracted_data[field])
                else:
                    prediction_values.append(defaults[field])
            
            print(f"OCR Extracted: {extracted_data}")
            print(f"Prediction values (with defaults): {prediction_values}")
            
            arr = np.array([prediction_values])
            arr = scaler.transform(arr)
            pred = model.predict_proba(arr)[0][1] * 100
            
            print(f"OCR Prediction: {pred}%")
            
            risk = "Low" if pred < 35 else "Moderate" if pred < 65 else "High"
            
            # Save prediction to database with all parameters
            conn = sqlite3.connect("heart.db")
            c = conn.cursor()
            c.execute("""INSERT INTO predictions (email, risk_level, prediction_result, created_at, age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal) 
                         VALUES (?, ?, ?, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                      (email, risk, pred, prediction_values[0], prediction_values[1], prediction_values[2], prediction_values[3], 
                       prediction_values[4], prediction_values[5], prediction_values[6], prediction_values[7], 
                       prediction_values[8], prediction_values[9], prediction_values[10], prediction_values[11], prediction_values[12]))
            conn.commit()
            conn.close()
            
            return jsonify({
                "ok": True, 
                "extracted": extracted_data,  # Only return actually extracted values
                "file_content": content[:500],
                "result": {"risk_level": risk, "prediction_result": pred}
            })
        else:
            return jsonify({"ok": False, "message": "No medical data found in file. Please check file format."}), 400
            
    except Exception as e:
        return jsonify({"ok": False, "message": f"OCR processing failed: {str(e)}"}), 500

# ---------- Parse Medical Text ----------
def parse_medical_text(text):
    """Extract ONLY values actually found in the file - no defaults"""
    try:
        print(f"=== RAW FILE CONTENT ===")
        print(text)
        print(f"=== END RAW CONTENT ===")
        
        extracted = {}
        found_count = 0
        
        # Extract Age
        age_match = re.search(r'Age\s*:\s*(\d+)', text, re.IGNORECASE)
        if age_match:
            extracted["age"] = int(age_match.group(1))
            found_count += 1
            print(f"✓ Age found: {extracted['age']}")
        
        # Extract Gender
        gender_match = re.search(r'Gender\s*:\s*(\w+)', text, re.IGNORECASE)
        if gender_match:
            gender = gender_match.group(1).lower()
            extracted["sex"] = 0 if 'female' in gender else 1
            found_count += 1
            print(f"✓ Gender found: {gender} -> {extracted['sex']}")
        
        # Extract Blood Pressure
        bp_match = re.search(r'Resting Blood Pressure.*?:\s*(\d+)', text, re.IGNORECASE)
        if bp_match:
            extracted["trestbps"] = int(bp_match.group(1))
            found_count += 1
            print(f"✓ BP found: {extracted['trestbps']}")
        
        # Extract Cholesterol
        chol_match = re.search(r'Cholesterol.*?:\s*(\d+)', text, re.IGNORECASE)
        if chol_match:
            extracted["chol"] = int(chol_match.group(1))
            found_count += 1
            print(f"✓ Cholesterol found: {extracted['chol']}")
        
        # Extract Heart Rate
        hr_match = re.search(r'Max Heart Rate\s*:\s*(\d+)', text, re.IGNORECASE)
        if hr_match:
            extracted["thalach"] = int(hr_match.group(1))
            found_count += 1
            print(f"✓ Heart Rate found: {extracted['thalach']}")
        
        # Extract Chest Pain Type
        cp_match = re.search(r'Chest Pain Type\s*:\s*([^\n]+)', text, re.IGNORECASE)
        if cp_match:
            cp_type = cp_match.group(1).strip().lower()
            if 'typical angina' in cp_type:
                extracted["cp"] = 0
            elif 'atypical' in cp_type:
                extracted["cp"] = 1
            elif 'non-anginal' in cp_type:
                extracted["cp"] = 2
            elif 'asymptomatic' in cp_type:
                extracted["cp"] = 3
            if "cp" in extracted:
                found_count += 1
                print(f"✓ Chest Pain found: {cp_type} -> {extracted['cp']}")
        
        # Extract Fasting Blood Sugar
        fbs_match = re.search(r'Fasting Blood Sugar.*?:\s*(\w+)', text, re.IGNORECASE)
        if fbs_match:
            fbs_val = fbs_match.group(1).lower()
            extracted["fbs"] = 1 if 'yes' in fbs_val else 0
            found_count += 1
            print(f"✓ FBS found: {fbs_val} -> {extracted['fbs']}")
        
        # Extract ECG
        ecg_match = re.search(r'Rest ECG\s*:\s*([^\n]+)', text, re.IGNORECASE)
        if ecg_match:
            ecg_val = ecg_match.group(1).strip().lower()
            if 'normal' in ecg_val:
                extracted["restecg"] = 0
            elif 'abnormality' in ecg_val or 'st-t' in ecg_val:
                extracted["restecg"] = 1
            elif 'lvh' in ecg_val:
                extracted["restecg"] = 2
            if "restecg" in extracted:
                found_count += 1
                print(f"✓ ECG found: {ecg_val} -> {extracted['restecg']}")
        
        # Extract Exercise Induced Angina
        angina_match = re.search(r'Exercise Induced Angina\s*:\s*(\w+)', text, re.IGNORECASE)
        if angina_match:
            angina_val = angina_match.group(1).lower()
            extracted["exang"] = 1 if 'yes' in angina_val else 0
            found_count += 1
            print(f"✓ Exercise Angina found: {angina_val} -> {extracted['exang']}")
        
        # Extract ST Depression
        oldpeak_match = re.search(r'ST Depression.*?:\s*([\d.]+)', text, re.IGNORECASE)
        if oldpeak_match:
            extracted["oldpeak"] = float(oldpeak_match.group(1))
            found_count += 1
            print(f"✓ ST Depression found: {extracted['oldpeak']}")
        
        # Extract Slope
        slope_match = re.search(r'Slope.*?:\s*([^\n]+)', text, re.IGNORECASE)
        if slope_match:
            slope_val = slope_match.group(1).strip().lower()
            if 'upsloping' in slope_val:
                extracted["slope"] = 0
            elif 'flat' in slope_val:
                extracted["slope"] = 1
            elif 'downsloping' in slope_val:
                extracted["slope"] = 2
            if "slope" in extracted:
                found_count += 1
                print(f"✓ Slope found: {slope_val} -> {extracted['slope']}")
        
        # Extract Number of Vessels
        vessel_match = re.search(r'Number of Major Vessels.*?:\s*(\d+)', text, re.IGNORECASE)
        if vessel_match:
            extracted["ca"] = int(vessel_match.group(1))
            found_count += 1
            print(f"✓ Vessels found: {extracted['ca']}")
        
        # Extract Thalassemia - handle various formats including truncated text
        thal_patterns = [
            r'Thalassemia\s*:\s*([^\n]+)',
            r'Thal\s*:\s*([^\n]+)',
            r'Thalassemia\s+([^\n]+)'
        ]
        
        for pattern in thal_patterns:
            thal_match = re.search(pattern, text, re.IGNORECASE)
            if thal_match:
                thal_val = thal_match.group(1).strip().lower()
                print(f"Raw Thalassemia text found: '{thal_val}'")
                
                if 'normal' in thal_val:
                    extracted["thal"] = 1
                elif 'fixed defect' in thal_val or 'fixed defec' in thal_val or 'fixed' in thal_val:
                    extracted["thal"] = 2
                elif 'reversible defect' in thal_val or 'reversible' in thal_val:
                    extracted["thal"] = 3
                
                if "thal" in extracted:
                    found_count += 1
                    print(f"✓ Thalassemia found: {thal_val} -> {extracted['thal']}")
                    break
                else:
                    print(f"⚠️ Thalassemia text found but not recognized: '{thal_val}'")
        
        print(f"=== EXTRACTION COMPLETE ===")
        print(f"Found {found_count} values: {extracted}")
        
        # Only return if we found at least some values
        if found_count > 0:
            return extracted
        else:
            print("❌ No medical values found in file")
            return None
        
    except Exception as e:
        print(f"❌ Error parsing: {e}")
        return None

# Helper functions for text parsing
def extract_age(text):
    """Extract age from text"""
    match = re.search(r'Age:\s*(\d+)', text, re.IGNORECASE)
    if match:
        age = int(match.group(1))
        print(f"Found age: {age}")
        return age
    return 50

def extract_bp(text):
    """Extract blood pressure from text"""
    match = re.search(r'Resting Blood Pressure.*?:\s*(\d+)', text, re.IGNORECASE)
    if match:
        bp = int(match.group(1))
        print(f"Found BP: {bp}")
        return bp
    return 120

def extract_cholesterol(text):
    """Extract cholesterol from text"""
    match = re.search(r'Cholesterol.*?:\s*(\d+)', text, re.IGNORECASE)
    if match:
        chol = int(match.group(1))
        print(f"Found cholesterol: {chol}")
        return chol
    return 200

def extract_heart_rate(text):
    """Extract max heart rate from text"""
    match = re.search(r'Max Heart Rate:\s*(\d+)', text, re.IGNORECASE)
    if match:
        hr = int(match.group(1))
        print(f"Found heart rate: {hr}")
        return hr
    return 150

def extract_oldpeak(text):
    """Extract ST Depression from text"""
    match = re.search(r'ST Depression.*?:\s*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
    if match:
        oldpeak = float(match.group(1))
        print(f"Found oldpeak: {oldpeak}")
        return oldpeak
    return 1.0

def extract_gender_from_text(text):
    """Extract gender from text"""
    match = re.search(r'Gender:\s*(\w+)', text, re.IGNORECASE)
    if match:
        gender = match.group(1).lower()
        print(f"Found gender: {gender}")
        if 'female' in gender:
            return 0
        else:
            return 1
    return 1

def extract_chest_pain_from_text(text):
    """Extract chest pain type from text"""
    match = re.search(r'Chest Pain Type:\s*([^\n]+)', text, re.IGNORECASE)
    if match:
        cp_type = match.group(1).lower()
        print(f"Found chest pain type: {cp_type}")
        if 'typical angina' in cp_type:
            return 0
        elif 'atypical' in cp_type:
            return 1
        elif 'non-anginal' in cp_type:
            return 2
        elif 'asymptomatic' in cp_type:
            return 3
    return 0

def extract_fbs_from_text(text):
    """Extract fasting blood sugar from text"""
    match = re.search(r'Fasting Blood Sugar.*?:\s*(\w+)', text, re.IGNORECASE)
    if match:
        fbs = match.group(1).lower()
        print(f"Found FBS: {fbs}")
        if 'yes' in fbs:
            return 1
        else:
            return 0
    return 1

def extract_ecg_from_text(text):
    """Extract ECG result from text"""
    match = re.search(r'Rest ECG:\s*([^\n]+)', text, re.IGNORECASE)
    if match:
        ecg = match.group(1).lower()
        print(f"Found ECG: {ecg}")
        if 'normal' in ecg:
            return 0
        elif 'st-t abnormality' in ecg or 'abnormality' in ecg:
            return 1
        elif 'lvh' in ecg:
            return 2
    return 1

def extract_angina_from_text(text):
    """Extract exercise induced angina from text"""
    match = re.search(r'Exercise Induced Angina:\s*(\w+)', text, re.IGNORECASE)
    if match:
        angina = match.group(1).lower()
        print(f"Found angina: {angina}")
        if 'yes' in angina:
            return 1
        else:
            return 0
    return 1

def extract_slope_from_text(text):
    """Extract slope of peak exercise ST segment"""
    match = re.search(r'Slope.*?:\s*([^\n]+)', text, re.IGNORECASE)
    if match:
        slope = match.group(1).lower()
        print(f"Found slope: {slope}")
        if 'upsloping' in slope:
            return 0
        elif 'flat' in slope:
            return 1
        elif 'downsloping' in slope:
            return 2
    return 2

def extract_vessels_from_text(text):
    """Extract number of major vessels colored by fluoroscopy"""
    match = re.search(r'Number of Major Vessels.*?:\s*(\d+)', text, re.IGNORECASE)
    if match:
        vessels = int(match.group(1))
        print(f"Found vessels: {vessels}")
        return vessels
    return 3

def extract_thal_from_text(text):
    """Extract thalassemia result"""
    match = re.search(r'Thalassemia:\s*([^\n]+)', text, re.IGNORECASE)
    if match:
        thal = match.group(1).lower()
        print(f"Found thalassemia: {thal}")
        if 'normal' in thal:
            return 1
        elif 'fixed defect' in thal:
            return 2
        elif 'reversible defect' in thal:
            return 3
    return 2

# ---------- Run ----------
if __name__ == "__main__":
    app.run(debug=True)
