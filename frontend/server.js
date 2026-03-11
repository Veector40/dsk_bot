import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

// Initialize SQLite Database
const db = new Database('dsk_triage.db', { verbose: console.log });

// Create the table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_text TEXT,
    company_name TEXT,
    eik TEXT,
    requested_amount TEXT,
    pos_details TEXT,
    priority TEXT,
    status TEXT,
    flag_reason TEXT,
    draft_reply TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// API Route: Save a processed request
app.post('/api/save-request', (req, res) => {
  const { 
    original_text, company_name, eik, requested_amount, 
    pos_details, priority, status, flag_reason, draft_reply 
  } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO requests 
      (original_text, company_name, eik, requested_amount, pos_details, priority, status, flag_reason, draft_reply) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      original_text, company_name, eik, requested_amount, 
      pos_details, priority, status, flag_reason, draft_reply
    );
    
    res.status(201).json({ success: true, id: info.lastInsertRowid });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ success: false, error: 'Failed to save to database' });
  }
});

// API Route: Get all requests for a dashboard
app.get('/api/requests', (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM requests ORDER BY created_at DESC");
    const requests = stmt.all();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch from database' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🏦 DSK Database Server running on http://localhost:${PORT}`);
});