// Admin JavaScript

// ============ UTILITIES ============

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Lien copié !');
  });
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============ MODALS ============

function closeModal() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

function closeSuccessModal() {
  document.getElementById('successModal')?.classList.remove('active');
}

function closePreviewModal() {
  document.getElementById('previewModal')?.classList.remove('active');
}

function closeResultModal() {
  document.getElementById('resultModal')?.classList.remove('active');
}

// Close modal on backdrop click
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ============ TESTIMONIALS ============

async function togglePublish(id, published) {
  try {
    const res = await fetch(`/admin/testimonials/${id}/publish`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published })
    });

    if (!res.ok) throw new Error('Erreur');
    showToast(published ? 'Témoignage publié' : 'Témoignage dépublié');
  } catch (err) {
    showToast('Erreur lors de la mise à jour', 'error');
  }
}

async function deleteTestimonial(id) {
  if (!confirm('Supprimer ce témoignage ?')) return;

  try {
    const res = await fetch(`/admin/testimonials/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erreur');

    document.querySelector(`[data-id="${id}"]`)?.remove();
    showToast('Témoignage supprimé');
  } catch (err) {
    showToast('Erreur lors de la suppression', 'error');
  }
}

async function showFullTestimonial(id) {
  try {
    const res = await fetch(`/admin/testimonials/${id}`);
    const data = await res.json();

    const modal = document.getElementById('testimonialModal');
    const content = document.getElementById('modalContent');

    const wantsContactHtml = data.wants_contact ? `
      <div class="modal-contact-alert">
        <strong>🎯 Souhaite être contacté par Yoan Lureault</strong>
        ${data.contact_topics ? `<p>Sujets : ${data.contact_topics}</p>` : ''}
      </div>
    ` : '';

    content.innerHTML = `
      <div class="modal-testimonial">
        <div class="modal-info">
          <h3>${data.firstname} ${data.lastname}</h3>
          ${data.position ? `<p class="position">${data.position}</p>` : ''}
          ${data.email ? `<p class="email">${data.email}</p>` : ''}
          <p class="rating">${getRatingEmoji(data.rating)} ${data.rating}/10</p>
        </div>

        ${wantsContactHtml}

        <div class="modal-section">
          <h4>Ce qu'il/elle a appris</h4>
          <p>${data.learned}</p>
        </div>

        <div class="modal-section">
          <h4>Témoignage</h4>
          <p>${data.testimonial}</p>
        </div>

        <div class="modal-meta">
          <p><strong>Campagne :</strong> ${data.campaign_name || '-'}</p>
          <p><strong>Type :</strong> ${data.type_name || '-'}</p>
          <p><strong>Entreprise :</strong> ${data.company || '-'}</p>
          <p><strong>Facilitateurs :</strong> ${data.facilitators || '-'}</p>
          <p><strong>Date :</strong> ${data.date || '-'}</p>
        </div>
      </div>
    `;

    modal.classList.add('active');
  } catch (err) {
    showToast('Erreur lors du chargement', 'error');
  }
}

function getRatingEmoji(rating) {
  if (rating >= 9) return '🤩';
  if (rating >= 7) return '😊';
  if (rating >= 5) return '😐';
  if (rating >= 3) return '😕';
  return '😞';
}

// ============ CAMPAIGNS ============

function openCreateCampaignModal() {
  document.getElementById('campaignModalTitle').textContent = 'Nouvelle campagne';
  document.getElementById('campaignForm').reset();
  document.getElementById('campaignId').value = '';
  document.getElementById('campaignModal').classList.add('active');
}

async function editCampaign(id) {
  try {
    const res = await fetch(`/admin/campaigns/${id}`);
    const data = await res.json();

    document.getElementById('campaignModalTitle').textContent = 'Modifier la campagne';
    document.getElementById('campaignId').value = data.id;
    document.getElementById('campaignName').value = data.name;
    document.getElementById('campaignType').value = data.type_id || '';
    document.getElementById('campaignFacilitators').value = data.facilitators || '';
    document.getElementById('campaignCompany').value = data.company || '';
    document.getElementById('campaignDate').value = data.date || '';

    document.getElementById('campaignModal').classList.add('active');
  } catch (err) {
    showToast('Erreur lors du chargement', 'error');
  }
}

async function deleteCampaign(id) {
  if (!confirm('Supprimer cette campagne ?')) return;

  try {
    const res = await fetch(`/admin/campaigns/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Erreur', 'error');
      return;
    }

    document.querySelector(`[data-id="${id}"]`)?.remove();
    showToast('Campagne supprimée');
  } catch (err) {
    showToast('Erreur lors de la suppression', 'error');
  }
}

function copyGeneratedLink() {
  const link = document.getElementById('generatedLink').value;
  copyToClipboard(link);
}

// Campaign form submission
document.getElementById('campaignForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('campaignId').value;
  const data = {
    name: document.getElementById('campaignName').value,
    type_id: document.getElementById('campaignType').value || null,
    facilitators: document.getElementById('campaignFacilitators').value,
    company: document.getElementById('campaignCompany').value,
    date: document.getElementById('campaignDate').value
  };

  try {
    const url = id ? `/admin/campaigns/${id}` : '/admin/campaigns';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
      showToast(result.error || 'Erreur', 'error');
      return;
    }

    closeModal();

    if (!id && result.link) {
      // New campaign - show success modal with link
      document.getElementById('generatedLink').value = result.link;
      document.getElementById('successModal').classList.add('active');
    } else {
      showToast('Campagne enregistrée');
    }

    // Reload page to see changes
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    showToast('Erreur lors de l\'enregistrement', 'error');
  }
});

// ============ TYPES ============

function openCreateTypeModal() {
  document.getElementById('typeModalTitle').textContent = 'Nouveau type';
  document.getElementById('typeForm').reset();
  document.getElementById('typeId').value = '';
  document.getElementById('typeModal').classList.add('active');
}

function editType(id, name) {
  document.getElementById('typeModalTitle').textContent = 'Modifier le type';
  document.getElementById('typeId').value = id;
  document.getElementById('typeName').value = name;
  document.getElementById('typeModal').classList.add('active');
}

async function deleteType(id) {
  if (!confirm('Supprimer ce type ?')) return;

  try {
    const res = await fetch(`/admin/types/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Erreur', 'error');
      return;
    }

    document.querySelector(`[data-id="${id}"]`)?.remove();
    showToast('Type supprimé');
  } catch (err) {
    showToast('Erreur lors de la suppression', 'error');
  }
}

// Type form submission
document.getElementById('typeForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('typeId').value;
  const name = document.getElementById('typeName').value;

  try {
    const url = id ? `/admin/types/${id}` : '/admin/types';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!res.ok) throw new Error('Erreur');

    closeModal();
    showToast('Type enregistré');
    setTimeout(() => location.reload(), 1000);
  } catch (err) {
    showToast('Erreur lors de l\'enregistrement', 'error');
  }
});

// ============ TEMPLATES ============

function openCreateTemplateModal() {
  document.getElementById('templateModalTitle').textContent = 'Nouveau template';
  document.getElementById('templateForm').reset();
  document.getElementById('templateId').value = '';
  document.getElementById('templateModal').classList.add('active');
}

async function editTemplate(id) {
  try {
    const res = await fetch(`/admin/templates/${id}`);
    const data = await res.json();

    document.getElementById('templateModalTitle').textContent = 'Modifier le template';
    document.getElementById('templateId').value = data.id;
    document.getElementById('templateName').value = data.name;
    document.getElementById('templateSubject').value = data.subject;
    document.getElementById('templateBody').value = data.body;

    document.getElementById('templateModal').classList.add('active');
  } catch (err) {
    showToast('Erreur lors du chargement', 'error');
  }
}

async function previewTemplate(id) {
  try {
    const res = await fetch(`/admin/templates/${id}`);
    const data = await res.json();

    const iframe = document.getElementById('previewFrame');
    iframe.srcdoc = data.body;

    document.getElementById('previewModal').classList.add('active');
  } catch (err) {
    showToast('Erreur lors du chargement', 'error');
  }
}

async function deleteTemplate(id) {
  if (!confirm('Supprimer ce template ?')) return;

  try {
    const res = await fetch(`/admin/templates/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erreur');

    document.querySelector(`[data-id="${id}"]`)?.remove();
    showToast('Template supprimé');
  } catch (err) {
    showToast('Erreur lors de la suppression', 'error');
  }
}

// Template form submission
document.getElementById('templateForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('templateId').value;
  const data = {
    name: document.getElementById('templateName').value,
    subject: document.getElementById('templateSubject').value,
    body: document.getElementById('templateBody').value
  };

  try {
    const url = id ? `/admin/templates/${id}` : '/admin/templates';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Erreur');

    closeModal();
    showToast('Template enregistré');
    setTimeout(() => location.reload(), 1000);
  } catch (err) {
    showToast('Erreur lors de l\'enregistrement', 'error');
  }
});

// ============ SEND EMAIL ============

function updateVariables() {
  const select = document.getElementById('sendCampaign');
  const option = select.options[select.selectedIndex];

  if (!option || !option.value) {
    document.getElementById('varType').textContent = '-';
    document.getElementById('varCompany').textContent = '-';
    document.getElementById('varFacilitators').textContent = '-';
    document.getElementById('varDate').textContent = '-';
    document.getElementById('varLink').textContent = '-';
    return;
  }

  document.getElementById('varType').textContent = option.dataset.type || '-';
  document.getElementById('varCompany').textContent = option.dataset.company || '-';
  document.getElementById('varFacilitators').textContent = option.dataset.facilitators || '-';
  document.getElementById('varDate').textContent = option.dataset.date || '-';

  const baseUrl = window.location.origin;
  document.getElementById('varLink').textContent = `${baseUrl}/t/${option.dataset.slug}`;

  updatePreview();
}

async function updatePreview() {
  const campaignId = document.getElementById('sendCampaign')?.value;
  const templateId = document.getElementById('sendTemplate')?.value;
  const prenom = document.getElementById('sendPrenom')?.value;

  if (!campaignId || !templateId) {
    document.getElementById('previewSubject').textContent = 'Sélectionnez une campagne et un template';
    document.getElementById('previewFrame').srcdoc = '';
    return;
  }

  try {
    const res = await fetch('/admin/send/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaignId, template_id: templateId, prenom })
    });

    const data = await res.json();

    document.getElementById('previewSubject').textContent = data.subject;
    document.getElementById('previewFrame').srcdoc = data.body;

    // Store for copy
    window.currentEmailHtml = data.body;
  } catch (err) {
    console.error('Preview error:', err);
  }
}

function copyHtml() {
  if (window.currentEmailHtml) {
    navigator.clipboard.writeText(window.currentEmailHtml);
    showToast('HTML copié !');
  }
}

// Send form submission
document.getElementById('sendForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    campaign_id: document.getElementById('sendCampaign').value,
    template_id: document.getElementById('sendTemplate').value,
    emails: document.getElementById('sendEmails').value,
    prenom: document.getElementById('sendPrenom').value
  };

  try {
    const res = await fetch('/admin/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    // Show results
    const content = document.getElementById('resultContent');
    let html = '<div class="send-results">';

    result.results.forEach(r => {
      if (r.success) {
        html += `<div class="result-item success"><span>✓</span> ${r.email}</div>`;
      } else {
        html += `<div class="result-item error"><span>✗</span> ${r.email}: ${r.error}</div>`;
      }
    });

    html += '</div>';
    content.innerHTML = html;
    document.getElementById('resultModal').classList.add('active');

    showToast('Emails envoyés !');
  } catch (err) {
    showToast('Erreur lors de l\'envoi', 'error');
  }
});

// Add toast styles dynamically
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  .toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: #1e293b;
    color: white;
    border-radius: 8px;
    font-size: 14px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s;
    z-index: 10000;
  }
  .toast.show {
    opacity: 1;
    transform: translateY(0);
  }
  .toast-success { border-left: 4px solid #14b8a6; }
  .toast-error { border-left: 4px solid #ef4444; }

  .modal-testimonial { }
  .modal-info { margin-bottom: 1.5rem; }
  .modal-info h3 { color: white; margin-bottom: 0.25rem; }
  .modal-info .position { color: #94a3b8; font-size: 0.9rem; }
  .modal-info .email { color: #64748b; font-size: 0.85rem; }
  .modal-info .rating { font-size: 1.25rem; color: #5eead4; margin-top: 0.5rem; }
  .modal-section { background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; }
  .modal-section h4 { color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
  .modal-section p { color: #e2e8f0; line-height: 1.6; }
  .modal-meta { border-top: 1px solid rgba(51, 65, 85, 0.5); padding-top: 1rem; }
  .modal-meta p { color: #64748b; font-size: 0.85rem; margin-bottom: 0.25rem; }
  .modal-meta strong { color: #94a3b8; }

  .modal-contact-alert {
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
    color: #86efac;
  }
  .modal-contact-alert p { margin-top: 0.5rem; font-size: 0.9rem; }

  .send-results { }
  .result-item { padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
  .result-item.success { background: rgba(34, 197, 94, 0.2); color: #86efac; }
  .result-item.error { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
`;
document.head.appendChild(toastStyle);
