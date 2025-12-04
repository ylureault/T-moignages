/**
 * Replace template variables with actual values
 * Available variables:
 * - {{prenom}} - First name (preceded by space if present)
 * - {{entreprise}} - Company name
 * - {{type}} - Type of accompaniment
 * - {{facilitateurs}} - Facilitator names
 * - {{date}} - Date of accompaniment
 * - {{lien}} - Link to the form
 * - {{lien_button}} - HTML button with link
 */
function replaceVariables(template, variables) {
  let result = template;

  // Handle prenom specially - add space before if present
  if (variables.prenom && variables.prenom.trim()) {
    result = result.replace(/\{\{prenom\}\}/g, ` ${variables.prenom}`);
  } else {
    result = result.replace(/\{\{prenom\}\}/g, '');
  }

  // Replace other variables
  result = result.replace(/\{\{entreprise\}\}/g, variables.entreprise || '');
  result = result.replace(/\{\{type\}\}/g, variables.type || '');
  result = result.replace(/\{\{facilitateurs\}\}/g, variables.facilitateurs || '');
  result = result.replace(/\{\{date\}\}/g, variables.date || '');
  result = result.replace(/\{\{lien\}\}/g, variables.lien || '');

  // Generate HTML button for lien_button
  const buttonHtml = `<a href="${variables.lien || '#'}" style="display:inline-block;background-color:#E63946;color:#ffffff;text-decoration:none;padding:15px 40px;border-radius:5px;font-size:16px;font-weight:bold;">Partager mon expérience →</a>`;
  result = result.replace(/\{\{lien_button\}\}/g, buttonHtml);

  return result;
}

module.exports = {
  replaceVariables
};
