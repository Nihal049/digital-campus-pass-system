const db = require('../db');
const { ingestDocument } = require('./vectorStore');

const CAMPUS_POLICIES = [
  {
    title: 'Campus Gate Timings & Movement Control Regulations',
    category: 'GATE_POLICY',
    sourceFile: 'policy_gate_timings_2026.pdf',
    text: `CAMPUS GATE OPERATING HOURS AND ACCESS REGULATIONS
Effective Academic Year 2026-2027

Section 1: Gate Timings and Designation
1. Main Gate (Gate 1): Open 24/7 for authorized personnel, verified staff, and emergency medical departures. Standard student entry/exit is permitted from 6:00 AM to 10:30 PM.
2. North Gate (Gate 2 - Academic Complex): Operational Monday through Saturday from 7:00 AM to 8:00 PM. Closed on Sundays and gazetted holidays.
3. Hostel Gate (Gate 3 - Residential Zone): Operational from 6:00 AM to 9:00 PM daily.

Section 2: Curfew Rules for Hostel Residents
1. Standard evening curfew for all undergraduate hostel residents is 8:30 PM on weekdays (Monday through Friday).
2. On Saturdays and Sundays, curfew is extended to 9:00 PM.
3. Any student arriving after curfew hours must present an Approved Emergency Pass or receive written authorization from the Chief Warden. Unverified late entry will be logged into the Security Incident Register and notified to faculty mentors.

Section 3: Mandatory Gate Verification
1. Every student, faculty member, staff, and visitor must present a valid Digital QR Pass at the gate security kiosk.
2. Security officers must scan the QR code using the handheld or tablet camera scanner to record timestamp, gate ID, and action (ENTRY or EXIT).
3. Physical ID cards must accompany digital passes when requested by campus security personnel.`
  },
  {
    title: 'Digital Campus Pass Application, Approval & Revocation Protocols',
    category: 'PASS_POLICY',
    sourceFile: 'handbook_pass_approval_rules.pdf',
    text: `DIGITAL CAMPUS PASS GUIDELINES AND APPROVAL WORKFLOWS
Office of the Dean of Student Affairs

Section 1: Categories of Digital Campus Passes
1. Day Outing Pass: For personal errands, local visits, or shopping within city limits. Valid for up to 6 hours between 6:00 AM and 8:30 PM.
2. Emergency Medical Pass: Issued immediately for urgent healthcare consultations, hospital visits, or medical appointments. Requires clinic prescription or medical dispensary note upon return.
3. Special Duty (Academic / Sports) Pass: Issued for representing the college in technical symposiums, hackathons, sports tournaments, or official university duties. Valid for up to 48 hours.
4. Hostel Weekend Leave Pass: Required for overnight stays at home or authorized guardian residence. Valid from Friday 4:00 PM through Monday 7:30 AM.

Section 2: Application Deadlines and Approval Hierarchy
1. Day Outing Passes must be submitted through the portal at least 2 hours prior to the planned departure time.
2. Approval authority for Day Outing Passes rests with the designated Faculty Mentor or Department Class Incharge.
3. Weekend Leave and Overnight Passes require dual authorization: Faculty Mentor followed by the Chief Hostel Warden.
4. Emergency passes can be pre-approved or granted post-facto with warden endorsement.

Section 3: Pass Cancellation and Administrative Revocation
1. Students may cancel their pending pass request at any time prior to faculty approval.
2. Once approved, passes cannot be modified. If plans change, the pass must be cancelled or allowed to expire.
3. Campus Administrators and Chief Security Officers hold revocation privileges. A pass may be revoked immediately if fraudulent statements or disciplinary infractions are discovered.`
  },
  {
    title: 'Visitor Registration, Clearance & Campus Protocol',
    category: 'VISITOR_RULES',
    sourceFile: 'visitor_management_sop_2026.pdf',
    text: `VISITOR MANAGEMENT STANDARD OPERATING PROCEDURES (SOP)
Campus Security & Public Relations Directorate

Section 1: Advance Registration and Host Clearance
1. All non-campus personnel (parents, prospective students, vendors, guest lecturers, contractors) must register via the Visitor Management Portal.
2. Every visitor must specify an authorized campus host (Faculty member, Department Head, Administrative Officer, or enrolled student).
3. The campus host receives an instant notification and must approve the visit request before a Visitor Pass QR is generated.

Section 2: Acceptable Identification and Identity Verification
1. Visitors must present a valid Government Identification card at Gate 1 (Aadhaar Card, Passport, Driver License, or Voter ID).
2. Gate security will verify the visitor's face, photo ID, and scan the approved Visitor QR code before issuing a temporary Visitor Badge.
3. Contact phone numbers must be verified during registration.

Section 3: Visiting Hours and Campus Restrictions
1. General visiting hours are restricted to 9:00 AM to 6:30 PM daily.
2. Visitors are not allowed inside student hostel rooms or residential dormitories at any time under any circumstances. Meetings with students must occur in the Administrative Visitor Lounge or Campus Cafeteria.
3. All visitors must check out at the security gate prior to 7:00 PM.`
  },
  {
    title: 'Hostel Code of Conduct, Attendance & Disciplinary Action',
    category: 'HOSTEL_RULES',
    sourceFile: 'hostel_regulations_handbook.pdf',
    text: `RESIDENTIAL HOSTEL CODE OF CONDUCT & LEAVE RULES
Hostel Management Committee

Section 1: Daily Night Attendance
1. Biometric or manual roll call is conducted daily across all hostel blocks between 9:00 PM and 9:30 PM.
2. A student marked absent without an approved Hostel Leave Pass or Special Duty Pass will receive an unexcused absence infraction.
3. Three unexcused absences in a single semester will trigger an automatic notification to parents and suspension of outing pass privileges for 30 academic days.

Section 2: Disciplinary Sanctions for Forgery or QR Tampering
1. Sharing screenshots of someone else's QR pass, manipulating digital timestamps, or presenting fraudulent emergency passes is classified as severe misconduct.
2. Violators will face immediate disciplinary committee review, a monetary penalty of Rs. 2,000, and mandatory campus community service.`
  },
  {
    title: 'Laboratories, Research Centers & Central Library Access Protocols',
    category: 'LAB_LIBRARY_POLICY',
    sourceFile: 'academic_facilities_access.pdf',
    text: `CENTRAL LIBRARY & ADVANCED RESEARCH LAB ACCESS PROTOCOL
Dean of Academic Affairs

Section 1: Library Operating Timings
1. Central Library operates Monday through Saturday from 8:00 AM to 10:00 PM.
2. During mid-semester and end-semester examination cycles, reading halls remain open until 11:30 PM.
3. Students studying past 8:30 PM must hold a validated Library Late Study Pass or have their student ID scanned at the Library Security Desk.

Section 2: After-Hours Research Laboratory Access
1. Postgraduate and final-year undergraduate students conducting experimental research in specialized labs (Robotics, AI/ML Server Cluster, VLSI, Advanced Chemistry) may request After-Hours Lab Clearance.
2. Requests must be countersigned by the Principal Project Investigator and Department Head.
3. Security officers conduct hourly rounds of all active research laboratories between 10:00 PM and 6:00 AM.`
  }
];

async function seedCampusKnowledgeBase() {
  try {
    const res = await db.get('SELECT COUNT(*) as count FROM rag_documents');
    const count = parseInt(res?.count || '0', 10);

    if (count === 0) {
      console.log('Seeding official campus documents into RAG Knowledge Base in PostgreSQL...');

      for (const policy of CAMPUS_POLICIES) {
        await ingestDocument({
          title: policy.title,
          category: policy.category,
          sourceFile: policy.sourceFile,
          rawText: policy.text
        });
      }

      console.log(`✓ Seeded ${CAMPUS_POLICIES.length} campus policy documents with full semantic chunking and vector embeddings into PostgreSQL.`);
    }
  } catch (err) {
    console.error('Failed to seed RAG knowledge base:', err);
  }
}

module.exports = {
  seedCampusKnowledgeBase
};
