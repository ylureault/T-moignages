const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'temoignages.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type_id INTEGER,
      facilitators TEXT,
      company TEXT,
      date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (type_id) REFERENCES types(id)
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      firstname TEXT NOT NULL,
      lastname TEXT NOT NULL,
      email TEXT,
      position TEXT,
      rating INTEGER CHECK(rating >= 1 AND rating <= 10),
      learned TEXT,
      testimonial TEXT,
      can_publish INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 0,
      wants_contact INTEGER DEFAULT 0,
      contact_topics TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      template_id INTEGER,
      recipient_email TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (template_id) REFERENCES templates(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default types if not exist
  const typeCount = db.prepare('SELECT COUNT(*) as count FROM types').get();
  if (typeCount.count === 0) {
    const insertType = db.prepare('INSERT INTO types (name) VALUES (?)');
    const defaultTypes = [
      'Diagnostic Boussole 4C',
      'Séminaire CODIR',
      'Séminaire d\'équipe',
      'Formation Manager Facilitateur',
      'Formation Facilitation',
      'Accompagnement stratégique',
      'Atelier collectif',
      'Autre'
    ];
    defaultTypes.forEach(type => insertType.run(type));
  }

  // Insert default templates if not exist
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM templates').get();
  if (templateCount.count === 0) {
    const insertTemplate = db.prepare('INSERT INTO templates (name, subject, body) VALUES (?, ?, ?)');

    // Template 1: Demande post-accompagnement
    const template1Body = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a1a;padding:30px;text-align:center;">
              <img src="https://insuffle.com/logo-blanc.png" alt="Insuffle" height="40" style="height:40px;">
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <h1 style="color:#1a1a1a;font-size:24px;margin:0 0 20px 0;">
                Votre avis compte pour nous 🙏
              </h1>

              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 15px 0;">
                Bonjour{{prenom}},
              </p>

              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 15px 0;">
                Vous avez récemment participé à <strong>{{type}}</strong> avec {{facilitateurs}}.
              </p>

              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 15px 0;">
                Chez Insuffle, nous croyons que chaque transformation réussie mérite d'être partagée. Votre témoignage peut inspirer d'autres équipes à franchir le pas.
              </p>

              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 25px 0;">
                <strong>2 minutes suffisent</strong> pour nous dire ce que vous avez retenu et vécu.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:10px 0 30px 0;">
                    {{lien_button}}
                  </td>
                </tr>
              </table>

              <!-- Share callout -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:8px;margin-bottom:20px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="color:#333;font-size:14px;line-height:1.6;margin:0;">
                      <strong>💡 Vous n'étiez pas seul(e) ?</strong><br>
                      N'hésitez pas à transférer ce mail aux autres participants. Plus nous avons de retours, mieux nous pouvons nous améliorer et aider d'autres équipes.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color:#666;font-size:14px;line-height:1.6;margin:0;">
                Merci pour votre confiance,<br>
                <strong>L'équipe Insuffle</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:25px 30px;text-align:center;border-top:1px solid #eee;">
              <p style="color:#999;font-size:12px;margin:0 0 10px 0;">
                Insuffle - Facilitation & Transformation
              </p>
              <p style="color:#999;font-size:12px;margin:0;">
                <a href="https://insuffle.com" style="color:#E63946;text-decoration:none;">insuffle.com</a> ·
                <a href="https://www.linkedin.com/company/insuffle" style="color:#E63946;text-decoration:none;">LinkedIn</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    insertTemplate.run('Demande post-accompagnement', 'Votre avis compte pour nous 🙏', template1Body);

    // Template 2: Relance
    const template2Body = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a1a;padding:30px;text-align:center;">
              <img src="https://insuffle.com/logo-blanc.png" alt="Insuffle" height="40" style="height:40px;">
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <h1 style="color:#1a1a1a;font-size:24px;margin:0 0 20px 0;">
                Un petit mot de votre part ? 💬
              </h1>

              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 15px 0;">
                Bonjour{{prenom}},
              </p>

              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 15px 0;">
                Il y a quelques semaines, vous avez participé à <strong>{{type}}</strong> chez {{entreprise}}.
              </p>

              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 25px 0;">
                Nous serions ravis d'avoir votre retour ! <strong>2 minutes</strong> suffisent pour partager votre expérience.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:10px 0 30px 0;">
                    {{lien_button}}
                  </td>
                </tr>
              </table>

              <p style="color:#666;font-size:14px;line-height:1.6;margin:0;">
                Merci d'avance,<br>
                <strong>L'équipe Insuffle</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:25px 30px;text-align:center;border-top:1px solid #eee;">
              <p style="color:#999;font-size:12px;margin:0 0 10px 0;">
                Insuffle - Facilitation & Transformation
              </p>
              <p style="color:#999;font-size:12px;margin:0;">
                <a href="https://insuffle.com" style="color:#E63946;text-decoration:none;">insuffle.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    insertTemplate.run('Relance', 'Un petit mot de votre part ?', template2Body);
  }

  console.log('Database initialized successfully');
}

// Generate short unique slug (8 chars, no ambiguous characters)
function generateSlug() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // No 0, O, 1, l, i
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// Get a setting value
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

// Set a setting value
function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
  `).run(key, value, value);
}

// Get all settings
function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
}

module.exports = {
  db,
  initDatabase,
  generateSlug,
  getSetting,
  setSetting,
  getAllSettings
};
