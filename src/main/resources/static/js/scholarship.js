import { api, escapeHtml, isSignedIn, levelLabel, providerLabel } from './api.js';

const signedIn = isSignedIn();
document.querySelectorAll('[data-guest-only]').forEach((node) => {
  node.hidden = signedIn;
});
document.querySelectorAll('[data-member-only]').forEach((node) => {
  node.hidden = !signedIn;
});

const code = new URLSearchParams(location.search).get('code');
const head = document.getElementById('detailHead');
const body = document.getElementById('detailBody');
const main = document.getElementById('detailMain');
const side = document.getElementById('detailSide');
const errorBox = document.getElementById('detailError');

function list(items, emptyText) {
  if (!items || items.length === 0) {
    return `<p class="tiny muted">${escapeHtml(emptyText)}</p>`;
  }
  return `<ul class="req-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

async function load() {
  if (!code) {
    fail('No scholarship code was given.');
    return;
  }

  let program;
  try {
    program = await api(`/api/scholarships/${encodeURIComponent(code)}`, { auth: false });
  } catch (error) {
    fail(error.message);
    return;
  }

  document.title = `${program.name} — SchoHub`;

  head.innerHTML = `
    <div class="program-top" style="margin-bottom: 16px;">
      <span class="badge badge-type">${escapeHtml(providerLabel(program.providerType))}</span>
      ${(program.levels || []).map((level) => `<span class="badge">${escapeHtml(levelLabel(level))}</span>`).join('')}
      ${program.renewalEnabled ? '<span class="badge badge-met">Renewal supported</span>' : ''}
    </div>
    <h1 class="display" style="font-size: clamp(1.9rem, 3.6vw, 2.9rem); margin-bottom: 10px;">
      ${escapeHtml(program.name)}
    </h1>
    <p class="muted" style="margin-bottom: 4px;">${escapeHtml(program.provider)}</p>
    <p style="margin: 0; font-size: 1.05rem; color: var(--ink-soft);">${escapeHtml(program.benefit || '')}</p>`;

  main.innerHTML = `
    ${program.description ? `<p class="lede" style="font-size: 1rem;">${escapeHtml(program.description)}</p>` : ''}

    <h2>GWA requirement</h2>
    ${list(program.gwaRequirements, 'No fixed GWA cut-off is published for this program.')}

    <h2>Residency</h2>
    ${list(program.residencyRequirements, 'No residency restriction is published for this program.')}

    <h2>Other conditions</h2>
    ${list(program.otherRequirements, 'No additional conditions are published.')}

    <h2>Documents to prepare</h2>
    <p class="tiny muted" style="margin-bottom: 10px;">Standard core documents, plus anything specific to this program.</p>
    <ul class="doc-list">
      ${(program.coreDocuments || []).map((document) => `<li>${escapeHtml(document)}</li>`).join('')}
      ${(program.specificDocuments || []).map((document) => `<li><strong>${escapeHtml(document)}</strong></li>`).join('')}
    </ul>

    <h2>Renewal requirements</h2>
    <ul class="doc-list">
      ${(program.renewalDocuments || []).map((document) => `<li>${escapeHtml(document)}</li>`).join('')}
    </ul>
    ${program.minUnitsForRenewal ? `<p class="tiny muted">Requires at least ${program.minUnitsForRenewal} enrolled units and a GWA of at least ${program.retentionGwaPercent ? program.retentionGwaPercent + '%' : 'the program cut-off'} to renew.</p>` : ''}

    ${program.notes ? `<div class="alert alert-info" style="margin-top: 22px;">${escapeHtml(program.notes)}</div>` : ''}`;

  side.innerHTML = `
    <h3>Apply through the provider</h3>
    <p class="tiny muted">SchoHub does not collect applications. You will be redirected to the
      ${escapeHtml(program.provider)} portal or office instructions.</p>
    <a class="btn btn-primary" href="${escapeHtml(program.applicationUrl || '#')}" target="_blank" rel="noopener">
      Open provider portal
    </a>
    ${
      signedIn
        ? '<a class="btn btn-outline" href="/dashboard.html">Check my eligibility</a>'
        : '<a class="btn btn-outline" href="/signup.html">Create an account to check eligibility</a>'
    }
    <hr style="border:0; border-top:1px solid var(--line); margin: 20px 0;">
    <h3>At a glance</h3>
    <ul class="profile-facts">
      <li><span>Provider</span><strong>${escapeHtml(program.provider)}</strong></li>
      <li><span>Type</span><strong>${escapeHtml(providerLabel(program.providerType))}</strong></li>
      <li><span>Levels</span><strong>${(program.levels || []).map(levelLabel).map(escapeHtml).join(', ') || 'All'}</strong></li>
      <li><span>Renewal</span><strong>${program.renewalEnabled ? 'Yes' : 'No'}</strong></li>
    </ul>
    <p class="tiny muted" style="margin: 0;">Program code: ${escapeHtml(program.code)}</p>`;

  body.hidden = false;
}

function fail(message) {
  document.getElementById('detailErrorMessage').textContent = message;
  errorBox.hidden = false;
  head.innerHTML = '';
}

load();
