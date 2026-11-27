import {
  api,
  escapeHtml,
  levelLabel,
  mountAppHeader,
  percentText,
  providerLabel,
  requireAuth,
  setSession,
  showAlert,
} from './api.js';

const state = {
  data: null,
  includeIneligible: false,
  saving: false,
};

const matchesPanel = document.getElementById('matchesPanel');
const renewalPanel = document.getElementById('renewalPanel');
const noPathPanel = document.getElementById('noPathPanel');
const matchGrid = document.getElementById('matchGrid');
const matchCount = document.getElementById('matchCount');
const showAllToggle = document.getElementById('showAll');

if (requireAuth()) {
  init();
}

async function init() {
  showAllToggle.checked = state.includeIneligible;
  showAllToggle.addEventListener('change', () => {
    state.includeIneligible = showAllToggle.checked;
    load();
  });

  await load();
}

async function load() {
  try {
    const data = await api(`/api/me/dashboard?includeIneligible=${state.includeIneligible}`);
    state.data = data;
    setSession(null, data.student);
    render(data);
  } catch (error) {
    document.getElementById('dashMessage').textContent = error.message;
  }
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function render(data) {
  const { student, profile, applicationPath } = data;
  mountAppHeader(student);
  renderSidebar(student, applicationPath);

  document.getElementById('dashMessage').textContent = data.message;

  document.getElementById('profileAlert').hidden = true;
  matchesPanel.hidden = true;
  renewalPanel.hidden = true;
  noPathPanel.hidden = true;

  if (!profile.complete && data.profile.missingFields.length > 0) {
    const alert = document.getElementById('profileAlert');
    alert.className = 'alert alert-info';
    alert.innerHTML = `<div><strong>Your profile is missing a few details.</strong><br>
      ${escapeHtml(data.profile.missingFields.join(' · '))}<br>
      <a href="/profile.html">Complete your profile</a> so matches stay accurate.</div>`;
    alert.hidden = false;
  } else if (profile.recommendations && profile.recommendations.length > 0 && applicationPath !== 'RENEWAL') {
    const alert = document.getElementById('profileAlert');
    alert.className = 'alert alert-info';
    alert.innerHTML = `<div><strong>Unlock more scholarships.</strong><br>
      ${escapeHtml(profile.recommendations.slice(0, 2).join(' '))}<br>
      <a href="/profile.html">Add these details</a></div>`;
    alert.hidden = false;
  }

  if (!applicationPath) {
    noPathPanel.hidden = false;
    return;
  }

  if (applicationPath === 'RENEWAL') {
    renewalPanel.hidden = false;
    renderRenewal(data);
    return;
  }

  matchesPanel.hidden = false;
  renderMatches(data.matches || []);
}

function renderSidebar(student, applicationPath) {
  const identity = student.baseIdentity || {};
  document.querySelector('[data-name]').textContent = identity.fullName || 'Student';
  document.querySelector('[data-school]').textContent = identity.school || 'School not set yet';
  document.querySelector('[data-gwa]').textContent = percentText(identity.gwaPercent);
  document.querySelector('[data-gwa-note]').textContent =
    identity.gwaScale === 'COLLEGE_1_TO_5' ? `college GWA ${identity.gwaValue}` : 'previous semester GWA';
  document.querySelector('[data-program]').textContent = identity.program || '—';
  document.querySelector('[data-level]').textContent = identity.educationLevel
    ? levelLabel(identity.educationLevel)
    : '—';
  document.querySelector('[data-year]').textContent = identity.schoolYear || '—';
  document.querySelector('[data-residence]').textContent =
    [identity.city, identity.province].filter(Boolean).join(', ') || '—';
  document.querySelector('[data-path]').textContent =
    applicationPath === 'RENEWAL' ? 'Scholarship renewal' : applicationPath ? 'New application' : 'Not chosen';

  const switchLink = document.getElementById('switchPath');
  if (applicationPath === 'RENEWAL') {
    switchLink.textContent = 'Switch to new application';
    switchLink.href = '/profile.html?branch=new';
  } else if (applicationPath === 'NEW_APPLICATION') {
    switchLink.textContent = 'Switch to renewal';
    switchLink.href = '/profile.html?branch=renew';
  } else {
    switchLink.textContent = 'Choose a track';
    switchLink.href = '/profile.html';
  }
}

function renderMatches(matches) {
  const eligible = matches.filter((match) => match.eligible).length;
  matchCount.textContent =
    matches.length === 0
      ? 'No programs to show yet'
      : `${eligible} of ${matches.length} program${matches.length === 1 ? '' : 's'} matched`;

  if (matches.length === 0) {
    matchGrid.innerHTML = `
      <div class="empty" style="grid-column: 1 / -1;">
        <h3>No matches yet</h3>
        <p>SchoHub could not find a program you qualify for with the current details.
          Add your household income, lowest subject grade or academic rank, then check again.</p>
        <a class="btn btn-primary" href="/profile.html">Update my profile</a>
      </div>`;
    return;
  }

  matchGrid.innerHTML = matches.map(matchCard).join('');
}

function matchCard(match) {
  const program = match.scholarship;
  const met = match.checks.filter((check) => check.met).length;
  const documents = [...(match.coreDocuments || []), ...(match.specificDocuments || [])];

  const checks = match.checks
    .map((check) => {
      const kind = check.advisory ? 'advisory' : check.met ? 'ok' : 'miss';
      const mark = check.advisory ? '!' : check.met ? '✓' : '✕';
      return `<li class="check ${kind === 'ok' ? '' : kind}">
        <span class="check-mark">${mark}</span>
        <div><strong>${escapeHtml(check.requirement)}</strong><span>${escapeHtml(check.detail)}</span></div>
      </li>`;
    })
    .join('');

  const documentItems = documents
    .map((document) => `<li>${escapeHtml(document)}</li>`)
    .join('');

  return `
    <article class="program">
      <div class="program-top">
        <span class="badge badge-type">${escapeHtml(providerLabel(program.providerType))}</span>
        <span class="badge ${match.eligible ? 'badge-met' : 'badge-miss'}">
          ${match.eligible ? 'Matched' : 'Not eligible'}
        </span>
      </div>
      <h3 class="program-name">${escapeHtml(program.name)}</h3>
      <p class="program-provider">${escapeHtml(program.provider)}</p>
      <p class="program-benefit">${escapeHtml(program.benefit || '')}</p>
      <p class="program-summary ${match.eligible ? '' : 'is-miss'}">${escapeHtml(match.summary)}</p>

      <details class="program-details">
        <summary>Requirements (${met}/${match.checks.length} met)</summary>
        <ul class="checks">${checks}</ul>
        <h4>Documents to prepare</h4>
        <ul class="doc-list">${documentItems}</ul>
      </details>

      <div class="program-actions">
        <a class="btn btn-outline btn-sm" href="/scholarship.html?code=${encodeURIComponent(program.code)}">Details</a>
        <a class="btn btn-primary btn-sm" href="${escapeHtml(match.applicationUrl || '#')}"
           target="_blank" rel="noopener">Apply</a>
      </div>
    </article>`;
}

function renderRenewal(data) {
  const renewal = data.renewal;
  const student = data.student;
  if (!renewal) {
    renewalPanel.innerHTML = '<div class="empty"><h3>Renewal status unavailable</h3></div>';
    return;
  }

  const checks = (renewal.checks || [])
    .map((check) => {
      const kind = check.advisory ? 'advisory' : check.met ? 'ok' : 'miss';
      const mark = check.advisory ? '!' : check.met ? '✓' : '✕';
      return `<li class="check ${kind === 'ok' ? '' : kind}">
        <span class="check-mark">${mark}</span>
        <div><strong>${escapeHtml(check.requirement)}</strong><span>${escapeHtml(check.detail)}</span></div>
      </li>`;
    })
    .join('');

  const checklist = (renewal.checklist || [])
    .map(
      (item) => `
      <label class="doc-toggle">
        <input type="checkbox" data-doc="${escapeHtml(item.name)}" ${item.onHand ? 'checked' : ''}>
        <span>${escapeHtml(item.name)}</span>
      </label>`,
    )
    .join('');

  renewalPanel.innerHTML = `
    <div class="card card-pad">
      <div class="renewal-status ${renewal.eligible ? 'is-ok' : ''}">
        <span class="badge ${renewal.eligible ? 'badge-met' : 'badge-miss'}">
          ${renewal.eligible ? 'Renewal ready' : 'Action needed'}
        </span>
        <div>
          <h3>${escapeHtml(renewal.scholarshipName || 'No scholarship selected')}</h3>
          <p>${escapeHtml(renewal.message || '')}</p>
        </div>
      </div>

      <div class="renewal-meta">
        <div><span>Enrolled units</span><strong>${renewal.enrolledUnits ?? '—'}</strong></div>
        <div><span>Required units</span><strong>${renewal.requiredUnits ?? '—'}</strong></div>
        <div><span>Previous term GWA</span><strong>${percentText(renewal.previousTermGwaPercent)}</strong></div>
        <div><span>Retention GWA</span><strong>${percentText(renewal.retentionGwaPercent)}</strong></div>
      </div>

      <h3 style="font-size:.76rem; letter-spacing:.1em; text-transform:uppercase; color:var(--muted);">Renewal requirements</h3>
      <ul class="checks">${checks}</ul>

      <h3 style="font-size:.76rem; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin-top:24px;">
        Documents on hand
      </h3>
      <div id="renewalDocs">${checklist}</div>

      <div class="form-actions">
        <span class="tiny muted">Tick a document to save your progress.</span>
        <span class="spacer"></span>
        <a class="btn btn-outline btn-sm" href="/profile.html?branch=renew">Edit renewal details</a>
        <a class="btn btn-primary btn-sm" href="${escapeHtml(renewal.applicationUrl || '#')}"
           target="_blank" rel="noopener">Provider portal</a>
      </div>
    </div>`;

  renewalPanel.querySelectorAll('[data-doc]').forEach((input) => {
    input.addEventListener('change', () => toggleDocument(input, student));
  });
}

async function toggleDocument(input, student) {
  if (state.saving) {
    input.checked = !input.checked;
    return;
  }
  const renewal = student.renewal || {};
  const documentsOnHand = Array.from(renewalPanel.querySelectorAll('[data-doc]:checked')).map(
    (checkbox) => checkbox.dataset.doc,
  );

  state.saving = true;
  renewalPanel.querySelectorAll('[data-doc]').forEach((checkbox) => {
    checkbox.disabled = true;
  });

  try {
    const body = {
      applicationPath: 'RENEWAL',
      renewal: {
        activeScholarshipCode: renewal.activeScholarshipCode,
        enrolledUnits: renewal.enrolledUnits,
        previousTermGwaValue: renewal.previousTermGwaValue,
        previousTermGwaScale: renewal.previousTermGwaScale,
        documentsOnHand,
      },
    };
    await api('/api/me/path', { method: 'PUT', body });
    await load();
  } catch (error) {
    showAlert('profileAlert', error.message);
    input.checked = !input.checked;
  } finally {
    state.saving = false;
    renewalPanel.querySelectorAll('[data-doc]').forEach((checkbox) => {
      checkbox.disabled = false;
    });
  }
}
