# Afroid KYC — Python Mobile Application

Cross-platform Python mobile client for sovereign African founder verification.

## Supported Jurisdictions & ID Schemas
- **Nigeria**: National Identity Number (NIN), Bank Verification Number (BVN), Driver's License
- **Kenya**: National ID, Huduma Namba, Passport
- **Ethiopia**: Fayda Digital ID
- **Ghana**: Ghana Card
- **Pan-African**: AU Diplomatic / ECOWAS Biometric Passport

## Architecture & Flows
1. **QR Code Session Handshake**: Scans dynamic session QR from the `geezcodE IDE` screen.
2. **Camera Document Capture**: Client-side OCR extracting full name, date of birth, and identity number.
3. **AI Face Liveness Detection**: 3D motion selfie anti-spoofing and facial vector similarity matching.
4. **Cryptographic Stamping**: Stamped with a SHA-256 hash and synchronized directly into the central PostgreSQL database.

## Running Locally / Mobile Simulator

```bash
# Run simulator
python apps/mobile_kyc/main.py
```
