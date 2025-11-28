# AI-Powered Heart Disease Risk Assessment

## Overview

This project is a web-based application for early detection of heart disease risk using machine learning. It allows users to assess their heart disease risk by either manually entering health parameters or uploading medical documents (PDF, DOCX, or TXT) for automatic data extraction via OCR. The application uses a trained Random Forest model to predict risk levels and stores user data and predictions in a SQLite database.

The machine learning model is trained using the Heart Disease dataset from the UCI Machine Learning Repository, achieving high accuracy in predicting heart disease presence.

## Features

- **User Authentication**: Secure registration and login system with password hashing.
- **Manual Prediction**: Input health parameters manually through a user-friendly web form to get risk assessment.
- **OCR Document Processing**: Upload medical reports (PDF, Word, or text files) to automatically extract health data and perform predictions.
- **Prediction History**: View past predictions with detailed health parameters and timestamps.
- **Risk Categorization**: Predictions are categorized as Low (<35%), Moderate (35-65%), or High (>65%) risk.
- **Responsive Web Interface**: Clean, modern UI built with HTML, CSS, and JavaScript.

## Installation

### Prerequisites
- Python 3.7+
- pip (Python package installer)

### Steps
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Ensure the model files are present:
   - `heart_model.pkl`: Trained Random Forest model
   - `scaler.pkl`: StandardScaler for data preprocessing
   - `heart.csv`: Dataset used for training (optional, for reference)

4. Run the application:
   ```bash
   python app.py
   ```

5. Open your browser and navigate to `http://localhost:5000`

## Usage

1. **Register/Login**: Create an account or log in with existing credentials.
2. **Manual Input**: Fill in the health parameters form and click "Predict Risk" to get your assessment.
3. **Upload Document**: Select a medical document file, upload it, and the system will extract data and provide a prediction.
4. **View History**: Check your prediction history, including all past assessments and parameters.

### Health Parameters
The model uses 13 features:
- Age
- Sex
- Chest Pain Type
- Resting Blood Pressure
- Serum Cholesterol
- Fasting Blood Sugar
- Resting ECG Results
- Maximum Heart Rate
- Exercise Induced Angina
- ST Depression
- Slope of Peak Exercise ST Segment
- Number of Major Vessels
- Thalassemia

## Technologies Used

- **Backend**: Flask (Python web framework)
- **Database**: SQLite
- **Machine Learning**: scikit-learn, joblib
- **OCR & Document Processing**: pytesseract, PyPDF2, python-docx, Pillow
- **Frontend**: HTML, CSS, JavaScript
- **Other**: NumPy, Werkzeug, Jinja2

## Dataset

The model is trained on the [Heart Disease Dataset](https://archive.ics.uci.edu/dataset/45/heart+disease) from UCI ML Repository.
- **Instances**: 303
- **Features**: 13 clinical features + target
- **Target**: Presence of heart disease (0 = no, 1 = yes)

## Model Details

- **Algorithm**: Random Forest Classifier with hyperparameter tuning
- **Preprocessing**: Standard scaling of features
- **Training**: 70% train, 15% validation, 15% test split
- **Accuracy**: ~85-90% on test set (varies with random seed)
- **Training Notebook**: `heart_disease.ipynb` contains the complete model development process

The trained model (`heart_model.pkl`) and scaler (`scaler.pkl`) are saved using joblib for deployment.

## Deployment

This application is configured for deployment on platforms like Render or Heroku.

- **Procfile**: Defines the command to run the app
- **render.yaml**: Configuration for Render deployment

To deploy:
1. Push code to a Git repository
2. Connect to your deployment platform
3. Ensure all dependencies are listed in `requirements.txt`
4. Set environment variables if needed (none required for basic setup)

## Project Structure

```
├── app.py                 # Main Flask application
├── heart_disease.ipynb    # Model training notebook
├── requirements.txt       # Python dependencies
├── heart_model.pkl        # Trained model
├── scaler.pkl            # Data scaler
├── heart.csv             # Training dataset
├── heart.db              # SQLite database (created at runtime)
├── users.db              # User database (created at runtime)
├── Procfile              # Deployment configuration
├── render.yaml           # Render deployment config
├── templates/
│   └── index.html        # Main web page
├── static/
│   ├── styles.css        # CSS styles
│   ├── app.js            # Frontend JavaScript
│   └── enhanced_functions.js  # Additional JS functions
└── uploads/              # Temporary file uploads (created at runtime)
```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This application is for educational and informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns.
