const express = require('express');
const router = express.Router();
const { db, getSetting } = require('../utils/db');
const { sendEmail } = require('../utils/email');
const fs = require('fs');
const path = require('path');

// GET /:slug - Display testimonial form
router.get('/:slug', (req, res) => {
  const { slug } = req.params;

  // Get campaign by slug
  const campaign = db.prepare(`
    SELECT c.*, t.name as type_name
    FROM campaigns c
    LEFT JOIN types t ON c.type_id = t.id
    WHERE c.slug = ?
  `).get(slug);

  if (!campaign) {
    return res.status(404).send(getNotFoundPage());
  }

  // Read and populate form template
  const template = fs.readFileSync(path.join(__dirname, '../views/form.html'), 'utf-8');
  const html = template
    .replace(/\{\{slug\}\}/g, slug)
    .replace(/\{\{type_name\}\}/g, campaign.type_name || '')
    .replace(/\{\{facilitators\}\}/g, campaign.facilitators || '')
    .replace(/\{\{company\}\}/g, campaign.company || '')
    .replace(/\{\{date\}\}/g, campaign.date || '');

  res.send(html);
});

// POST /:slug - Submit testimonial
router.post('/:slug', express.urlencoded({ extended: true }), async (req, res) => {
  const { slug } = req.params;
  const { firstname, lastname, email, position, rating, learned, testimonial, can_publish, wants_contact, topics } = req.body;

  // Get campaign with type info
  const campaign = db.prepare(`
    SELECT c.*, t.name as type_name
    FROM campaigns c
    LEFT JOIN types t ON c.type_id = t.id
    WHERE c.slug = ?
  `).get(slug);

  if (!campaign) {
    return res.status(404).json({ error: 'Campagne non trouvée' });
  }

  // Validate required fields
  if (!firstname || !lastname || !rating || !learned || !testimonial || !can_publish) {
    return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires' });
  }

  // Process topics (can be array or single value)
  let contactTopics = null;
  if (wants_contact === 'yes' && topics) {
    contactTopics = Array.isArray(topics) ? topics.join(', ') : topics;
  }

  // Insert testimonial
  try {
    const result = db.prepare(`
      INSERT INTO testimonials (campaign_id, firstname, lastname, email, position, rating, learned, testimonial, can_publish, wants_contact, contact_topics)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      campaign.id,
      firstname,
      lastname,
      email || null,
      position || null,
      parseInt(rating),
      learned,
      testimonial,
      can_publish === 'on' ? 1 : 0,
      wants_contact === 'yes' ? 1 : 0,
      contactTopics
    );

    // Send notification email
    const notificationEmail = getSetting('notification_email') || 'contact@insuffle.com';
    const notificationHtml = generateNotificationEmail({
      firstname,
      lastname,
      email,
      position,
      rating: parseInt(rating),
      learned,
      testimonial,
      campaign,
      wants_contact: wants_contact === 'yes',
      contact_topics: contactTopics
    });

    sendEmail(
      notificationEmail,
      `Nouveau témoignage de ${firstname} ${lastname} - ${campaign.name}`,
      notificationHtml
    ).catch(err => console.error('Error sending notification:', err));

    // Return thanks page
    const template = fs.readFileSync(path.join(__dirname, '../views/thanks.html'), 'utf-8');
    const html = template
      .replace(/\{\{firstname\}\}/g, firstname)
      .replace(/\{\{slug\}\}/g, slug);
    res.send(html);
  } catch (error) {
    console.error('Error saving testimonial:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
  }
});

// Generate notification email HTML
function generateNotificationEmail(data) {
  const ratingEmoji = data.rating >= 9 ? '🤩' : data.rating >= 7 ? '😊' : data.rating >= 5 ? '😐' : '😕';
  const wantsContactBadge = data.wants_contact
    ? `<span style="background:#22c55e;color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;">SOUHAITE ÊTRE CONTACTÉ</span>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(to right,#14b8a6,#06b6d4);padding:24px;color:white;">
      <h1 style="margin:0;font-size:20px;">Nouveau témoignage reçu !</h1>
      <p style="margin:8px 0 0;opacity:0.9;">${data.campaign.name}</p>
    </div>

    <div style="padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div>
          <h2 style="margin:0;color:#1e293b;font-size:18px;">${data.firstname} ${data.lastname}</h2>
          ${data.position ? `<p style="margin:4px 0 0;color:#64748b;font-size:14px;">${data.position}</p>` : ''}
          ${data.email ? `<p style="margin:4px 0 0;color:#64748b;font-size:14px;">${data.email}</p>` : ''}
        </div>
        <div style="text-align:center;">
          <span style="font-size:32px;">${ratingEmoji}</span>
          <p style="margin:0;font-size:24px;font-weight:bold;color:#14b8a6;">${data.rating}/10</p>
        </div>
      </div>

      ${data.wants_contact ? `
      <div style="background:#dcfce7;border:1px solid #22c55e;border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="margin:0;color:#166534;font-weight:bold;">🎯 Souhaite être contacté par Yoan Lureault</p>
        ${data.contact_topics ? `<p style="margin:8px 0 0;color:#166534;">Sujets : ${data.contact_topics}</p>` : ''}
      </div>
      ` : ''}

      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Ce qu'il/elle a appris</p>
        <p style="margin:0;color:#334155;line-height:1.6;">${data.learned}</p>
      </div>

      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Témoignage</p>
        <p style="margin:0;color:#334155;line-height:1.6;">${data.testimonial}</p>
      </div>

      <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:16px;">
        <p style="margin:0;color:#64748b;font-size:13px;">
          <strong>Campagne :</strong> ${data.campaign.name}<br>
          <strong>Type :</strong> ${data.campaign.type_name || '-'}<br>
          <strong>Entreprise :</strong> ${data.campaign.company || '-'}<br>
          <strong>Facilitateurs :</strong> ${data.campaign.facilitators || '-'}
        </p>
      </div>
    </div>

    <div style="background:#1e293b;padding:16px;text-align:center;">
      <a href="${process.env.BASE_URL || 'https://temoignages.insuffle.com'}/admin/testimonials" style="color:#5eead4;text-decoration:none;font-size:14px;">
        Voir dans l'admin →
      </a>
    </div>
  </div>
</body>
</html>`;
}

function getNotFoundPage() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page non trouvée - Insuffle</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body class="public-page">
  <div class="container">
    <div class="card card-centered">
      <div class="logo-box">I</div>
      <h1>Page non trouvée</h1>
      <p class="text-muted">Ce lien de témoignage n'existe pas ou n'est plus valide.</p>
      <a href="https://insuffle.com" class="btn btn-primary">Retour à insuffle.com</a>
    </div>
  </div>
</body>
</html>`;
}

module.exports = router;
