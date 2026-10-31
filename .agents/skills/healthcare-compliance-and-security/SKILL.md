---
name: healthcare-compliance-and-security
description: Medical data security, HIPAA compliance, Vietnam Decree 13/2023/ND-CP personal data protection, HL7 FHIR R4 resource modeling, immutable audit logging, data masking, and cryptographic safeguards for healthcare systems.
origin: Healthcare Solution Architecture & Security Engineering
---

# Healthcare Compliance & Security Engineering Protocol

A specialized standard for AI agents building clinical, hospital, and health-tech applications. Enforces legal compliance, medical data interoperability, data privacy, and zero-trust security.

---

## When to Activate

Activate this skill whenever the task involves:
- Storing, processing, or transmitting Patient Health Information (PHI) or Personally Identifiable Information (PII).
- Modeling clinical data, electronic medical records (EMR/EHR), prescriptions, or diagnostic results.
- Implementing compliance with **Nghị định 13/2023/NĐ-CP** (Vietnam Personal Data Protection) or **HIPAA**.
- Formatting and exposing APIs using the **HL7 FHIR R4** international healthcare standard.
- Implementing patient identity data masking on public displays (queuing screens) and server logs.
- Building tamper-evident audit logging for medical record access.

---

## 1. Legal & Regulatory Guardrails

### 1.1. Nghị định 13/2023/NĐ-CP (Bảo Vệ Dữ Liệu Cá Nhân)
Medical data is classified as **Dữ liệu cá nhân nhạy cảm (Sensitive Personal Data)** under Article 2.4:
- **Explicit Consent (Điều 11):** Patients must explicitly opt-in for their health data to be stored and processed. Record the timestamp, IP address, and exact consent text in `patient_consents`.
- **Right to Access & Rectification (Điều 14, 15):** The system must provide endpoints allowing patients to view and request corrections to their profile.
- **Right to Erasure / Anonymization (Điều 16):** When a patient requests deletion, medical records cannot be physically deleted if required by medical archiving laws (Luật Khám bệnh, chữa bệnh quy định lưu trữ bệnh án ít nhất 10 - 20 năm). Instead, **cryptographically anonymize (pseudo-anonymize)** the identity link while preserving clinical statistics.

### 1.2. HIPAA Compliance Checklist (Health Insurance Portability and Accountability Act)
- **Security Rule:** Mandatory AES-256 encryption at rest and TLS 1.3 in transit.
- **Privacy Rule:** Access is strictly restricted to authorized medical personnel on a "Need-to-Know" basis.
- **Breach Notification:** Any unauthorized access must trigger automated alerts to the Data Protection Officer (DPO).

---

## 2. HL7 FHIR R4 Interoperability Architecture

Healthcare systems must not store clinical entities in arbitrary, proprietary formats. Model all domain data around **HL7 FHIR R4 (Fast Healthcare Interoperability Resources)**.

### 2.1. Core Resource Mappings

| Domain Entity | HL7 FHIR Resource | Key Fields |
| :--- | :--- | :--- |
| **Bệnh nhân** | `Patient` | `id`, `identifier` (CCCD/BHYT), `name`, `telecom`, `gender`, `birthDate` |
| **Bác sĩ** | `Practitioner` | `id`, `identifier` (Chứng chỉ hành nghề), `name`, `qualification` |
| **Lịch khám** | `Appointment` | `id`, `status`, `serviceCategory` (Tim mạch), `participant`, `start`, `end` |
| **Phiếu khám / Ca khám** | `Encounter` | `id`, `status`, `class`, `type`, `subject`, `period`, `reasonCode` (ICD-10) |
| **Chỉ số y tế (Huyết áp, ECG)** | `Observation` | `id`, `status`, `code` (LOINC), `subject`, `valueQuantity`, `component` |

### 2.2. Example FHIR R4 JSON Payload (`Observation` for Heart Rate & Blood Pressure)
```json
{
  "resourceType": "Observation",
  "id": "obs-cardio-9821",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "vital-signs",
          "display": "Vital Signs"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "8867-4",
        "display": "Heart rate"
      }
    ]
  },
  "subject": {
    "reference": "Patient/pat-10928"
  },
  "effectiveDateTime": "2026-09-22T08:30:00+07:00",
  "valueQuantity": {
    "value": 112,
    "unit": "beats/minute",
    "system": "http://unitsofmeasure.org",
    "code": "/min"
  },
  "interpretation": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
          "code": "H",
          "display": "High (Tachycardia / Nhịp tim nhanh)"
        }
      ]
    }
  ]
}
```

---

## 3. Data Masking & Privacy Engineering

### 3.1. Public Queue & Display Board Masking
Never display full patient names or identity numbers on waiting room LED boards, web dashboards, or printed public slips.

```typescript
// packages/shared/src/utils/masking.ts
export function maskPatientName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  
  const firstName = parts[0]; // Nguyễn
  const lastName = parts[parts.length - 1]; // An
  return `${firstName} ${'*'.repeat(3)} ${lastName}`; // Nguyễn *** An
}

export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 7) return '***';
  return phone.slice(0, 3) + '****' + phone.slice(-3); // 098****321
}

export function maskCitizenId(id: string): string {
  if (!id || id.length < 8) return '***';
  return id.slice(0, 4) + '****' + id.slice(-4); // 0010****8921
}
```

### 3.2. Server Log Sanitization (Zero-Leakage Rule)
Configure the application logger (Pino) to automatically redact all PHI/PII fields:
```typescript
import pino from 'pino';

export const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'patient.citizenId',
      'patient.phone',
      'patient.email',
      'patient.medicalHistory',
      'card.cvv',
      'card.number'
    ],
    censor: '[REDACTED_PHI]'
  }
});
```

---

## 4. Cryptographic Standards & Immutable Audit Logging

### 4.1. Encryption Standards
- **Data at Rest:** All database tables containing PHI and all S3 objects (DICOM images, ECG waveforms) must use **AES-256** via AWS KMS customer-managed keys (CMK) with automated annual rotation.
- **Data in Transit:** Enforce **TLS 1.3** minimum. Reject any TLS 1.0 or 1.1 handshakes at the ALB/Nginx layer.

### 4.2. Immutable Audit Logging Schema
Every single read, update, export, or print of a medical record must be appended to an immutable audit table. **No user, including DBAs, may update or delete audit records.**

```sql
CREATE TABLE medical_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,               -- Bác sĩ / Điều dưỡng thực hiện
    actor_role VARCHAR(50) NOT NULL,       -- DOCTOR, NURSE, ADMIN
    patient_id UUID NOT NULL,             -- Bệnh nhân bị truy cập hồ sơ
    action VARCHAR(50) NOT NULL,           -- VIEW_RECORD, EXPORT_ECG, UPDATE_DIAGNOSIS
    resource_type VARCHAR(50) NOT NULL,    -- Observation, Appointment, MedicalRecord
    resource_id UUID NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    justification TEXT,                    -- Lý do truy cập (khám bệnh, hội chẩn)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    signature VARCHAR(64) NOT NULL         -- HMAC-SHA256(actor_id + patient_id + action + created_at)
);

-- Bật cấm DELETE và UPDATE trên bảng Audit
CREATE RULE no_update_audit AS ON UPDATE TO medical_audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO medical_audit_logs DO INSTEAD NOTHING;
```

---

## 5. Break-Glass Emergency Access Protocol

In clinical emergencies (e.g., patient collapsed in emergency room with acute myocardial infarction):
- A doctor who is **not** the assigned primary physician may invoke the **"Break-Glass Procedure"** to instantly bypass normal access control and unlock the patient's full medical history and stent allergy records.
- **Audit Mandate:** The system immediately grants access, but logs an urgent `BREAK_GLASS` event with high priority, sending an alert notification to the Chief Medical Officer and hospital security audit queue.
