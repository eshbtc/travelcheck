# Quick Start Guide - Travel History Tracker

## 🚀 Getting Started in 5 Minutes

This guide will help you get the Travel History Tracker up and running locally for development.

## Prerequisites

- **Python 3.9+** with pip
- **Node.js 18+** with npm
- **PostgreSQL 14+**
- **Tesseract OCR** (for passport stamp processing)

### Install Tesseract OCR

**macOS:**
```bash
brew install tesseract
```

**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr
```

**Windows:**
Download from: https://github.com/UB-Mannheim/tesseract/wiki

## 🛠️ Setup Instructions

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd travel-check

# Copy environment file
cp env.example .env
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb travel_history

# Update .env with your database credentials
# DATABASE_URL=postgresql://username:password@localhost:5432/travel_history
```

### 4. Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install
```

### 5. API Credentials Setup

#### Gmail API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add credentials to `.env`:
   ```
   GMAIL_CLIENT_ID=your-client-id
   GMAIL_CLIENT_SECRET=your-client-secret
   ```

#### Office365 API Setup
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add Microsoft Graph API permissions
4. Create client secret
5. Add credentials to `.env`:
   ```
   OFFICE365_CLIENT_ID=your-client-id
   OFFICE365_CLIENT_SECRET=your-client-secret
   ```

## 🏃‍♂️ Running the Application

### Start Backend Server

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```

Backend will be available at: http://localhost:8000
API Documentation: http://localhost:8000/docs

### Start Frontend Server

```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:3000

## 🧪 Testing the Setup

### 1. Create User Account
- Go to http://localhost:3000
- Click "Get Started" or "Sign Up"
- Create a new account

### 2. Connect Email Account
- In the dashboard, click "Connect Gmail" or "Connect Office365"
- Complete OAuth flow
- Verify email account is connected

### 3. Upload Passport Image
- Go to "Passport Stamps" section
- Upload a passport page image
- Wait for OCR processing
- Review extracted stamp data

### 4. Generate Report
- Go to "Reports" section
- Click "Generate USCIS Report"
- Download the generated PDF

## 📁 Project Structure

```
travel-check/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── models/         # Data models
│   │   └── database.py     # Database setup
│   ├── main.py            # FastAPI app
│   └── requirements.txt   # Python dependencies
├── frontend/              # Next.js frontend
│   ├── src/
│   │   ├── pages/         # Next.js pages
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   └── services/      # API services
│   └── package.json       # Node dependencies
├── docs/                  # Documentation
└── tests/                 # Test files
```

## 🔧 Development Commands

### Backend Commands
```bash
# Run development server
python main.py

# Run tests
pytest

# Format code
black .

# Lint code
flake8

# Type checking
mypy .
```

### Frontend Commands
```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Type checking
npm run type-check
```

## 🐛 Troubleshooting

### Common Issues

**1. Tesseract not found**
```bash
# Check if tesseract is installed
tesseract --version

# Update TESSERACT_PATH in .env if needed
TESSERACT_PATH=/usr/local/bin/tesseract
```

**2. Database connection error**
```bash
# Check PostgreSQL is running
pg_ctl status

# Verify database exists
psql -l | grep travel_history
```

**3. Email API errors**
- Verify API credentials in `.env`
- Check OAuth redirect URIs match exactly
- Ensure APIs are enabled in cloud consoles

**4. OCR processing fails**
- Check image file format (JPEG, PNG, TIFF)
- Verify file size is under 10MB
- Ensure image quality is good

### Getting Help

1. Check the logs in `backend/logs/app.log`
2. Review API documentation at http://localhost:8000/docs
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

## 🚀 Next Steps

1. **Explore the API**: Visit http://localhost:8000/docs
2. **Test OCR**: Upload sample passport images
3. **Connect Email**: Test with your Gmail/Office365
4. **Generate Reports**: Create your first USCIS report
5. **Read Documentation**: Check `/docs` folder for detailed guides

## 📚 Additional Resources

- [Development Roadmap](DEVELOPMENT_ROADMAP.md)
- [API Documentation](docs/api/)
- [User Guide](docs/user-guide/)
- [Contributing Guidelines](CONTRIBUTING.md)

---

**Happy coding! 🎉**

For questions or issues, please check the troubleshooting section or create an issue in the repository.
