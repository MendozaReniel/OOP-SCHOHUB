import { api, escapeHtml, isSignedIn, levelLabel, providerLabel } from './api.js';

/* Swap the header and CTA buttons depending on whether a token is stored. */
const signedIn = isSignedIn();
document.querySelectorAll('[data-guest-only]').forEach((node) => {
  node.hidden = signedIn;
});
document.querySelectorAll('[data-member-only]').forEach((node) => {
  node.hidden = !signedIn;
});
document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

function programCard(program) {
  const levels = (program.levels || []).map(levelLabel).join(' · ');
  return `
    <article class="program">
      <div class="program-top">
        <span class="badge badge-type">${escapeHtml(providerLabel(program.providerType))}</span>
        ${program.renewalEnabled ? '<span class="badge">Renewal supported</span>' : ''}
      </div>
      <h3 class="program-name">${escapeHtml(program.name)}</h3>
      <p class="program-provider">${escapeHtml(program.provider)}</p>
      <p class="program-benefit">${escapeHtml(program.benefit || '')}</p>
      <p class="program-summary">${escapeHtml(levels || 'Open to all levels')}</p>
      <div class="program-actions">
        <a class="btn btn-outline btn-sm" href="/scholarship.html?code=${encodeURIComponent(program.code)}">View program</a>
      </div>
    </article>`;
}

async function loadPrograms() {
  const grid = document.getElementById('programGrid');
  try {
    const programs = await api('/api/scholarships', { auth: false });
    document.querySelectorAll('[data-program-count]').forEach((node) => {
      node.textContent = programs.length;
    });
    grid.innerHTML = programs.slice(0, 6).map(programCard).join('');
  } catch (error) {
    grid.innerHTML = `
      <div class="empty" style="grid-column: 1 / -1;">
        <h3>The catalog could not be loaded</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>`;
  }
}

loadPrograms();
