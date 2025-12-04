const express = require('express');
const router = express.Router();
const { db, generateSlug } = require('../utils/db');
const { requireAuth, createSession, destroySession, verifyPassword } = require('../middleware/auth');
const { replaceVariables } = require('../utils/template');
const { sendEmail } = require('../utils/email');
const fs = require('fs');
const path = require('path');

// Helper to read and wrap in layout
function renderAdminPage(content, activeMenu = '') {
  const layout = fs.readFileSync(path.join(__dirname, '../views/admin/layout.html'), 'utf-8');
  return layout
    .replace('{{content}}', content)
    .replace(new RegExp(`data-menu="${activeMenu}"`, 'g'), `data-menu="${activeMenu}" class="active"`);
}

// GET /admin - Login page
router.get('/', (req, res) => {
  const sessionToken = req.cookies?.session;
  if (sessionToken) {
    return res.redirect('/admin/testimonials');
  }
  const template = fs.readFileSync(path.join(__dirname, '../views/admin/login.html'), 'utf-8');
  res.send(template.replace('{{error}}', ''));
});

// POST /admin/login
router.post('/login', express.urlencoded({ extended: true }), (req, res) => {
  const { password } = req.body;

  if (verifyPassword(password)) {
    const token = createSession();
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    res.redirect('/admin/testimonials');
  } else {
    const template = fs.readFileSync(path.join(__dirname, '../views/admin/login.html'), 'utf-8');
    res.send(template.replace('{{error}}', '<div class="alert alert-error">Mot de passe incorrect</div>'));
  }
});

// GET /admin/logout
router.get('/logout', (req, res) => {
  const sessionToken = req.cookies?.session;
  if (sessionToken) {
    destroySession(sessionToken);
  }
  res.clearCookie('session');
  res.redirect('/admin');
});

// ============ TESTIMONIALS ============

// GET /admin/testimonials
router.get('/testimonials', requireAuth, (req, res) => {
  const { campaign_id, min_rating, published } = req.query;

  let query = `
    SELECT t.*, c.name as campaign_name, c.company, tp.name as type_name
    FROM testimonials t
    LEFT JOIN campaigns c ON t.campaign_id = c.id
    LEFT JOIN types tp ON c.type_id = tp.id
    WHERE 1=1
  `;
  const params = [];

  if (campaign_id) {
    query += ' AND t.campaign_id = ?';
    params.push(campaign_id);
  }
  if (min_rating) {
    query += ' AND t.rating >= ?';
    params.push(min_rating);
  }
  if (published === '1') {
    query += ' AND t.is_published = 1';
  } else if (published === '0') {
    query += ' AND t.is_published = 0';
  }

  query += ' ORDER BY t.created_at DESC';

  const testimonials = db.prepare(query).all(...params);
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();

  let content = fs.readFileSync(path.join(__dirname, '../views/admin/dashboard.html'), 'utf-8');

  // Generate testimonials HTML
  let testimonialsHtml = '';
  if (testimonials.length === 0) {
    testimonialsHtml = '<div class="empty-state"><p>Aucun témoignage pour le moment</p></div>';
  } else {
    testimonials.forEach(t => {
      const ratingEmoji = getRatingEmoji(t.rating);
      const wantsContactBadge = t.wants_contact ? '<span class="badge badge-contact">Souhaite être contacté</span>' : '';
      testimonialsHtml += `
        <div class="testimonial-card" data-id="${t.id}">
          <div class="testimonial-header">
            <div class="testimonial-info">
              <strong>${t.firstname} ${t.lastname}</strong>
              ${t.position ? `<span class="badge">${t.position}</span>` : ''}
              ${wantsContactBadge}
            </div>
            <div class="testimonial-rating">${ratingEmoji} ${t.rating}/10</div>
          </div>
          <div class="testimonial-meta">
            <span>${t.campaign_name || 'Sans campagne'}</span>
            ${t.company ? `<span>• ${t.company}</span>` : ''}
            ${t.type_name ? `<span>• ${t.type_name}</span>` : ''}
            ${t.contact_topics ? `<span>• Sujets: ${t.contact_topics}</span>` : ''}
          </div>
          <div class="testimonial-learned">
            <strong>Ce qu'il/elle a appris :</strong>
            <p>${truncate(t.learned, 150)}</p>
          </div>
          <div class="testimonial-text">
            <strong>Témoignage :</strong>
            <p>${truncate(t.testimonial, 200)}</p>
          </div>
          <div class="testimonial-actions">
            <label class="toggle-publish">
              <input type="checkbox" ${t.is_published ? 'checked' : ''} onchange="togglePublish(${t.id}, this.checked)">
              <span>Publié</span>
            </label>
            <button class="btn btn-sm btn-danger" onclick="deleteTestimonial(${t.id})">Supprimer</button>
            <button class="btn btn-sm" onclick="showFullTestimonial(${t.id})">Voir tout</button>
          </div>
        </div>
      `;
    });
  }

  // Generate campaigns filter options
  let campaignsOptions = '<option value="">Toutes les campagnes</option>';
  campaigns.forEach(c => {
    campaignsOptions += `<option value="${c.id}" ${campaign_id == c.id ? 'selected' : ''}>${c.name}</option>`;
  });

  content = content
    .replace('{{testimonials}}', testimonialsHtml)
    .replace('{{campaigns_options}}', campaignsOptions)
    .replace('{{testimonials_count}}', testimonials.length);

  res.send(renderAdminPage(content, 'testimonials'));
});

// PUT /admin/testimonials/:id/publish
router.put('/testimonials/:id/publish', requireAuth, express.json(), (req, res) => {
  const { id } = req.params;
  const { published } = req.body;

  try {
    db.prepare('UPDATE testimonials SET is_published = ? WHERE id = ?').run(published ? 1 : 0, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /admin/testimonials/:id
router.delete('/testimonials/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    db.prepare('DELETE FROM testimonials WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /admin/testimonials/:id
router.get('/testimonials/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const testimonial = db.prepare(`
    SELECT t.*, c.name as campaign_name, c.company, c.facilitators, c.date, tp.name as type_name
    FROM testimonials t
    LEFT JOIN campaigns c ON t.campaign_id = c.id
    LEFT JOIN types tp ON c.type_id = tp.id
    WHERE t.id = ?
  `).get(id);

  if (!testimonial) {
    return res.status(404).json({ error: 'Témoignage non trouvé' });
  }

  res.json(testimonial);
});

// ============ CAMPAIGNS ============

// GET /admin/campaigns
router.get('/campaigns', requireAuth, (req, res) => {
  const campaigns = db.prepare(`
    SELECT c.*, t.name as type_name,
      (SELECT COUNT(*) FROM testimonials WHERE campaign_id = c.id) as testimonial_count
    FROM campaigns c
    LEFT JOIN types t ON c.type_id = t.id
    ORDER BY c.created_at DESC
  `).all();

  const types = db.prepare('SELECT * FROM types ORDER BY name').all();

  let content = fs.readFileSync(path.join(__dirname, '../views/admin/campaigns.html'), 'utf-8');

  // Generate campaigns HTML
  let campaignsHtml = '';
  if (campaigns.length === 0) {
    campaignsHtml = '<div class="empty-state"><p>Aucune campagne créée</p></div>';
  } else {
    campaigns.forEach(c => {
      const baseUrl = process.env.BASE_URL || 'https://temoignages.insuffle.com';
      const link = `${baseUrl}/t/${c.slug}`;
      campaignsHtml += `
        <div class="campaign-card" data-id="${c.id}">
          <div class="campaign-header">
            <strong>${c.name}</strong>
            <span class="badge badge-count">${c.testimonial_count} témoignage${c.testimonial_count > 1 ? 's' : ''}</span>
          </div>
          <div class="campaign-meta">
            ${c.type_name ? `<span class="badge">${c.type_name}</span>` : ''}
            ${c.company ? `<span>${c.company}</span>` : ''}
            ${c.date ? `<span>• ${c.date}</span>` : ''}
            ${c.facilitators ? `<span>• ${c.facilitators}</span>` : ''}
          </div>
          <div class="campaign-link">
            <input type="text" readonly value="${link}" onclick="this.select()">
            <button class="btn btn-sm" onclick="copyToClipboard('${link}')">Copier</button>
          </div>
          <div class="campaign-actions">
            <button class="btn btn-sm" onclick="editCampaign(${c.id})">Modifier</button>
            <button class="btn btn-sm btn-danger" onclick="deleteCampaign(${c.id})">Supprimer</button>
          </div>
        </div>
      `;
    });
  }

  // Generate types options
  let typesOptions = '<option value="">Sélectionner un type</option>';
  types.forEach(t => {
    typesOptions += `<option value="${t.id}">${t.name}</option>`;
  });

  content = content
    .replace('{{campaigns}}', campaignsHtml)
    .replace('{{types_options}}', typesOptions)
    .replace('{{campaigns_count}}', campaigns.length);

  res.send(renderAdminPage(content, 'campaigns'));
});

// POST /admin/campaigns
router.post('/campaigns', requireAuth, express.json(), (req, res) => {
  const { name, type_id, facilitators, company, date } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }

  const slug = generateSlug();

  try {
    const result = db.prepare(`
      INSERT INTO campaigns (slug, name, type_id, facilitators, company, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(slug, name, type_id || null, facilitators || null, company || null, date || null);

    const baseUrl = process.env.BASE_URL || 'https://temoignages.insuffle.com';
    res.json({
      success: true,
      id: result.lastInsertRowid,
      slug: slug,
      link: `${baseUrl}/t/${slug}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /admin/campaigns/:id
router.get('/campaigns/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);

  if (!campaign) {
    return res.status(404).json({ error: 'Campagne non trouvée' });
  }

  res.json(campaign);
});

// PUT /admin/campaigns/:id
router.put('/campaigns/:id', requireAuth, express.json(), (req, res) => {
  const { id } = req.params;
  const { name, type_id, facilitators, company, date } = req.body;

  try {
    db.prepare(`
      UPDATE campaigns SET name = ?, type_id = ?, facilitators = ?, company = ?, date = ?
      WHERE id = ?
    `).run(name, type_id || null, facilitators || null, company || null, date || null, id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /admin/campaigns/:id
router.delete('/campaigns/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  // Check if campaign has testimonials
  const count = db.prepare('SELECT COUNT(*) as count FROM testimonials WHERE campaign_id = ?').get(id);
  if (count.count > 0) {
    return res.status(400).json({ error: 'Impossible de supprimer une campagne avec des témoignages' });
  }

  try {
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ TYPES ============

// GET /admin/types
router.get('/types', requireAuth, (req, res) => {
  const types = db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM campaigns WHERE type_id = t.id) as campaign_count
    FROM types t
    ORDER BY t.name
  `).all();

  let content = fs.readFileSync(path.join(__dirname, '../views/admin/types.html'), 'utf-8');

  // Generate types HTML
  let typesHtml = '';
  types.forEach(t => {
    typesHtml += `
      <div class="type-card" data-id="${t.id}">
        <div class="type-info">
          <strong>${t.name}</strong>
          <span class="badge">${t.campaign_count} campagne${t.campaign_count > 1 ? 's' : ''}</span>
        </div>
        <div class="type-actions">
          <button class="btn btn-sm" onclick="editType(${t.id}, '${t.name.replace(/'/g, "\\'")}')">Modifier</button>
          <button class="btn btn-sm btn-danger" onclick="deleteType(${t.id})" ${t.campaign_count > 0 ? 'disabled title="Utilisé par des campagnes"' : ''}>Supprimer</button>
        </div>
      </div>
    `;
  });

  content = content
    .replace('{{types}}', typesHtml)
    .replace('{{types_count}}', types.length);

  res.send(renderAdminPage(content, 'types'));
});

// POST /admin/types
router.post('/types', requireAuth, express.json(), (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }

  try {
    const result = db.prepare('INSERT INTO types (name) VALUES (?)').run(name);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /admin/types/:id
router.put('/types/:id', requireAuth, express.json(), (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    db.prepare('UPDATE types SET name = ? WHERE id = ?').run(name, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /admin/types/:id
router.delete('/types/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  // Check if type is used
  const count = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE type_id = ?').get(id);
  if (count.count > 0) {
    return res.status(400).json({ error: 'Ce type est utilisé par des campagnes' });
  }

  try {
    db.prepare('DELETE FROM types WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ TEMPLATES ============

// GET /admin/templates
router.get('/templates', requireAuth, (req, res) => {
  const templates = db.prepare('SELECT * FROM templates ORDER BY name').all();

  let content = fs.readFileSync(path.join(__dirname, '../views/admin/templates.html'), 'utf-8');

  // Generate templates HTML
  let templatesHtml = '';
  templates.forEach(t => {
    templatesHtml += `
      <div class="template-card" data-id="${t.id}">
        <div class="template-header">
          <strong>${t.name}</strong>
        </div>
        <div class="template-subject">
          <span class="label">Sujet :</span> ${t.subject}
        </div>
        <div class="template-actions">
          <button class="btn btn-sm" onclick="editTemplate(${t.id})">Modifier</button>
          <button class="btn btn-sm" onclick="previewTemplate(${t.id})">Prévisualiser</button>
          <button class="btn btn-sm btn-danger" onclick="deleteTemplate(${t.id})">Supprimer</button>
        </div>
      </div>
    `;
  });

  content = content
    .replace('{{templates}}', templatesHtml)
    .replace('{{templates_count}}', templates.length);

  res.send(renderAdminPage(content, 'templates'));
});

// GET /admin/templates/:id
router.get('/templates/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);

  if (!template) {
    return res.status(404).json({ error: 'Template non trouvé' });
  }

  res.json(template);
});

// POST /admin/templates
router.post('/templates', requireAuth, express.json(), (req, res) => {
  const { name, subject, body } = req.body;

  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    const result = db.prepare('INSERT INTO templates (name, subject, body) VALUES (?, ?, ?)').run(name, subject, body);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /admin/templates/:id
router.put('/templates/:id', requireAuth, express.json(), (req, res) => {
  const { id } = req.params;
  const { name, subject, body } = req.body;

  try {
    db.prepare(`
      UPDATE templates SET name = ?, subject = ?, body = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, subject, body, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /admin/templates/:id
router.delete('/templates/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    db.prepare('DELETE FROM templates WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SEND EMAIL ============

// GET /admin/send
router.get('/send', requireAuth, (req, res) => {
  const campaigns = db.prepare(`
    SELECT c.*, t.name as type_name
    FROM campaigns c
    LEFT JOIN types t ON c.type_id = t.id
    ORDER BY c.created_at DESC
  `).all();

  const templates = db.prepare('SELECT * FROM templates ORDER BY name').all();

  let content = fs.readFileSync(path.join(__dirname, '../views/admin/send.html'), 'utf-8');

  // Generate campaigns options
  let campaignsOptions = '<option value="">Sélectionner une campagne</option>';
  campaigns.forEach(c => {
    campaignsOptions += `<option value="${c.id}" data-type="${c.type_name || ''}" data-company="${c.company || ''}" data-facilitators="${c.facilitators || ''}" data-date="${c.date || ''}" data-slug="${c.slug}">${c.name}</option>`;
  });

  // Generate templates options
  let templatesOptions = '<option value="">Sélectionner un template</option>';
  templates.forEach(t => {
    templatesOptions += `<option value="${t.id}">${t.name} - ${t.subject}</option>`;
  });

  content = content
    .replace('{{campaigns_options}}', campaignsOptions)
    .replace('{{templates_options}}', templatesOptions);

  res.send(renderAdminPage(content, 'send'));
});

// POST /admin/send/preview
router.post('/send/preview', requireAuth, express.json(), (req, res) => {
  const { template_id, campaign_id, prenom } = req.body;

  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
  const campaign = db.prepare(`
    SELECT c.*, t.name as type_name
    FROM campaigns c
    LEFT JOIN types t ON c.type_id = t.id
    WHERE c.id = ?
  `).get(campaign_id);

  if (!template || !campaign) {
    return res.status(400).json({ error: 'Template ou campagne non trouvé' });
  }

  const baseUrl = process.env.BASE_URL || 'https://temoignages.insuffle.com';
  const variables = {
    prenom: prenom || '',
    entreprise: campaign.company || '',
    type: campaign.type_name || '',
    facilitateurs: campaign.facilitators || '',
    date: campaign.date || '',
    lien: `${baseUrl}/t/${campaign.slug}`
  };

  const subject = replaceVariables(template.subject, variables);
  const body = replaceVariables(template.body, variables);

  res.json({ subject, body });
});

// POST /admin/send
router.post('/send', requireAuth, express.json(), (req, res) => {
  const { template_id, campaign_id, emails, prenom } = req.body;

  if (!template_id || !campaign_id || !emails) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
  const campaign = db.prepare(`
    SELECT c.*, t.name as type_name
    FROM campaigns c
    LEFT JOIN types t ON c.type_id = t.id
    WHERE c.id = ?
  `).get(campaign_id);

  if (!template || !campaign) {
    return res.status(400).json({ error: 'Template ou campagne non trouvé' });
  }

  const baseUrl = process.env.BASE_URL || 'https://temoignages.insuffle.com';
  const variables = {
    prenom: prenom || '',
    entreprise: campaign.company || '',
    type: campaign.type_name || '',
    facilitateurs: campaign.facilitators || '',
    date: campaign.date || '',
    lien: `${baseUrl}/t/${campaign.slug}`
  };

  const subject = replaceVariables(template.subject, variables);
  const body = replaceVariables(template.body, variables);

  // Split emails by comma
  const emailList = emails.split(',').map(e => e.trim()).filter(e => e);

  // Send emails
  const results = [];
  Promise.all(emailList.map(async (email) => {
    const result = await sendEmail(email, subject, body);
    if (result.success) {
      // Log email
      db.prepare(`
        INSERT INTO email_logs (campaign_id, template_id, recipient_email)
        VALUES (?, ?, ?)
      `).run(campaign_id, template_id, email);
    }
    results.push({ email, ...result });
  })).then(() => {
    res.json({ success: true, results });
  }).catch(error => {
    res.status(500).json({ error: error.message });
  });
});

// Helper functions
function getRatingEmoji(rating) {
  if (rating >= 9) return '🤩';
  if (rating >= 7) return '😊';
  if (rating >= 5) return '😐';
  if (rating >= 3) return '😕';
  return '😞';
}

function truncate(str, length) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

module.exports = router;
