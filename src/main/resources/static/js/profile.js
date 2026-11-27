import {
  api,
  busy,
  escapeHtml,
  hideAlert,
  mountAppHeader,
  requireAuth,
  setSession,
  showAlert,
} from './api.js';

const state = {
  meta: null,
  student: null,
  scholarships: [],
  branch: null,
};

const identityPanel = document.getElementById('identityPanel');
const branchPanel = document.getElementById('branchPanel');
const identityForm = document.getElementById('identityForm');
const newForm = document.getElementById('newForm');
const renewalForm = document.getElementById('renewalForm');

async function init() {
  try {
    const [meta, student, scholarships] = await Promise.all([
      api('/api/meta', { auth: false }),
      api('/api/me'),
      api('/api/scholarships', { auth: false }),
    ]);

    state.meta = meta;
    state.student = student;
    state.scholarships = (scholarships || []).filter((program) => program.renewalEnabled);
    state.branch = student.applicationPath || null;

    mountAppHeader(student);
    fillOptions();
    prefillIdentity();
    prefillBranches();
    updateGwaHint();

    const identityComplete = Boolean(student.baseIdentity && student.baseIdentity.fullName);
    const requested = new URLSearchParams(location.search).get('branch');
    if (requested === 'new') state.branch = 'NEW_APPLICATION';
    if (requested === 'renew') state.branch = 'RENEWAL';

    if (state.branch) selectBranch(state.branch, { silent: true });

    showStep(identityComplete ? 2 : 1);
    if (!identityComplete && requested) showStep(1);
  } catch (error) {
    showAlert('identityError', error.message);
  }
}

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

function fillOptions() {
  const { meta } = state;

  fillSelect('educationLevel', meta.educationLevels, { placeholder: 'Select level' });
  fillSelect('gwaScale', meta.gwaScales);
  fillSelect('sex', meta.sexes, { placeholder: 'Prefer not to say' });
  fillSelect(
    'city',
    (meta.cities || []).map((city) => ({ value: city, label: city })),
    { placeholder: 'Select your city / municipality' },
  );
  fillSelect(
    'barangay',
    (meta.barangays || []).map((barangay) => ({ value: barangay, label: barangay })),
    { placeholder: 'Select your barangay' },
  );
  fillSelect('specialTrack', meta.specialTracks, { placeholder: 'None' });
  fillSelect('classRank', meta.classRanks, { placeholder: 'Not applicable' });
  fillSelect('previousTermGwaScale', meta.gwaScales);
  fillSelect(
    'activeScholarshipCode',
    state.scholarships.map((program) => ({ value: program.code, label: program.name })),
    { placeholder: 'Select a scholarship' },
  );

  const docs = document.getElementById('renewalDocs');
  docs.innerHTML = meta.renewalDocuments
    .map(
      (document, index) => `
      <label class="doc-toggle">
        <input type="checkbox" name="renewalDoc" value="${escapeHtml(document)}" id="doc-${index}">
        <span>${escapeHtml(document)}</span>
      </label>`,
    )
    .join('');
}

function fillSelect(id, options, { placeholder } = {}) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML =
    (placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : '') +
    (options || [])
      .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
      .join('');
}

/* ------------------------------------------------------------------ */
/* Prefill                                                             */
/* ------------------------------------------------------------------ */

function setValue(id, value) {
  const element = document.getElementById(id);
  if (!element || value === null || value === undefined) return;
  element.value = value;
}

function prefillIdentity() {
  const identity = state.student.baseIdentity || {};
  setValue('fullName', identity.fullName);
  setValue('birthday', identity.birthday);
  setValue('educationLevel', identity.educationLevel);
  setValue('school', identity.school);
  setValue('schoolYear', identity.schoolYear);
  setValue('program', identity.program);
  setValue('gwaValue', identity.gwaValue);
  setValue('gwaScale', identity.gwaScale);
  setValue('city', identity.city);
  setValue('province', identity.province);
  setValue('citizenship', identity.citizenship);
  setValue('sex', identity.sex);
}

function prefillBranches() {
  const newDetails = state.student.newApplication || {};
  setValue('barangay', newDetails.barangay);
  setValue('yearsOfResidency', newDetails.yearsOfResidency);
  setValue('annualFamilyIncome', newDetails.annualFamilyIncome);
  setValue('parentsRegisteredVoter', boolText(newDetails.parentsRegisteredVoter));
  setValue('siblingEbdGrantee', boolText(newDetails.siblingEbdGrantee));
  setValue('hasFailingDroppedIncompleteGrades', boolText(newDetails.hasFailingDroppedIncompleteGrades));
  setValue('indigencyStatus', boolText(newDetails.indigencyStatus));
  setValue('listahananBeneficiary', boolText(newDetails.listahananBeneficiary));
  setValue('lowestSubjectGrade', newDetails.lowestSubjectGrade);
  setValue('specialTrack', newDetails.specialTrack);
  setValue('classRank', newDetails.classRank);

  const renewal = state.student.renewal || {};
  setValue('activeScholarshipCode', renewal.activeScholarshipCode);
  setValue('enrolledUnits', renewal.enrolledUnits);
  setValue('previousTermGwaValue', renewal.previousTermGwaValue);
  setValue('previousTermGwaScale', renewal.previousTermGwaScale);

  const onHand = new Set(renewal.documentsOnHand || []);
  document.querySelectorAll('input[name="renewalDoc"]').forEach((input) => {
    input.checked = onHand.has(input.value);
  });
}

function boolText(value) {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
}

/* ------------------------------------------------------------------ */
/* Steps and branch selection                                          */
/* ------------------------------------------------------------------ */

function showStep(step) {
  identityPanel.hidden = step !== 1;
  branchPanel.hidden = step !== 2;
  document.querySelectorAll('.steps li').forEach((item) => {
    const itemStep = Number(item.dataset.step);
    item.classList.toggle('is-active', itemStep === step);
    item.classList.toggle('is-done', itemStep < step);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectBranch(branch, { silent } = {}) {
  state.branch = branch;
  document.querySelectorAll('[data-branch]').forEach((card) => {
    card.classList.toggle('is-selected', card.dataset.branch === branch);
  });
  newForm.hidden = branch !== 'NEW_APPLICATION';
  renewalForm.hidden = branch !== 'RENEWAL';
  if (!silent) hideAlert('branchError');
}

document.querySelectorAll('[data-branch]').forEach((card) => {
  card.addEventListener('click', () => selectBranch(card.dataset.branch));
});

document.querySelectorAll('[data-back]').forEach((button) => {
  button.addEventListener('click', () => showStep(1));
});

/* ------------------------------------------------------------------ */
/* GWA hint                                                            */
/* ------------------------------------------------------------------ */

function updateGwaHint() {
  const scale = document.getElementById('gwaScale').value;
  const hint = document.getElementById('gwaHint');
  if (!hint) return;
  hint.textContent = scale === 'COLLEGE_1_TO_5'
    ? 'Enter 1.00 (highest) to 5.00, e.g. 1.75'
    : 'Enter a percentage, e.g. 88.5';
}

document.getElementById('gwaScale').addEventListener('change', updateGwaHint);

/* ------------------------------------------------------------------ */
/* Saving                                                              */
/* ------------------------------------------------------------------ */

function numberOrNull(id) {
  const value = document.getElementById(id).value;
  return value === '' ? null : Number(value);
}

function boolOrNull(id) {
  const value = document.getElementById(id).value;
  if (value === '') return null;
  return value === 'true';
}

function fieldError(error) {
  if (error.errors) {
    const first = Object.values(error.errors)[0];
    if (first) return first;
  }
  return error.message;
}

identityForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!identityForm.reportValidity()) return;

  const payload = {
    fullName: document.getElementById('fullName').value.trim(),
    birthday: document.getElementById('birthday').value,
    educationLevel: document.getElementById('educationLevel').value,
    school: document.getElementById('school').value.trim(),
    schoolYear: document.getElementById('schoolYear').value.trim(),
    program: document.getElementById('program').value.trim(),
    gwaValue: numberOrNull('gwaValue'),
    gwaScale: document.getElementById('gwaScale').value,
    city: document.getElementById('city').value.trim(),
    province: document.getElementById('province').value.trim(),
    citizenship: document.getElementById('citizenship').value.trim() || null,
    sex: document.getElementById('sex').value || null,
  };

  const button = document.getElementById('saveIdentityBtn');
  busy(button, true, 'Saving…');
  try {
    const student = await api('/api/me/profile', { method: 'PUT', body: payload });
    state.student = student;
    setSession(null, student);
    mountAppHeader(student);
    hideAlert('identityError');
    showStep(2);
  } catch (error) {
    showAlert('identityError', fieldError(error));
  } finally {
    busy(button, false);
  }
});

async function saveBranch(event, branch) {
  event.preventDefault();
  if (!state.branch) {
    showAlert('branchError', 'Choose a new application or a renewal first.');
    return;
  }

  const form = branch === 'NEW_APPLICATION' ? newForm : renewalForm;
  if (!form.reportValidity()) return;

  const documentsOnHand = Array.from(document.querySelectorAll('input[name="renewalDoc"]:checked')).map(
    (input) => input.value,
  );

  const body =
    branch === 'NEW_APPLICATION'
      ? {
          applicationPath: 'NEW_APPLICATION',
          newApplication: {
            barangay: document.getElementById('barangay').value.trim(),
            yearsOfResidency: numberOrNull('yearsOfResidency'),
            parentsRegisteredVoter: boolOrNull('parentsRegisteredVoter'),
            siblingEbdGrantee: boolOrNull('siblingEbdGrantee'),
            annualFamilyIncome: numberOrNull('annualFamilyIncome'),
            indigencyStatus: boolOrNull('indigencyStatus'),
            listahananBeneficiary: boolOrNull('listahananBeneficiary'),
            hasFailingDroppedIncompleteGrades: boolOrNull('hasFailingDroppedIncompleteGrades'),
            lowestSubjectGrade: numberOrNull('lowestSubjectGrade'),
            specialTrack: document.getElementById('specialTrack').value || null,
            classRank: document.getElementById('classRank').value || null,
          },
        }
      : {
          applicationPath: 'RENEWAL',
          renewal: {
            activeScholarshipCode: document.getElementById('activeScholarshipCode').value,
            enrolledUnits: numberOrNull('enrolledUnits'),
            previousTermGwaValue: numberOrNull('previousTermGwaValue'),
            previousTermGwaScale: document.getElementById('previousTermGwaScale').value,
            documentsOnHand,
          },
        };

  const button = document.getElementById(branch === 'NEW_APPLICATION' ? 'saveNewBtn' : 'saveRenewalBtn');
  busy(button, true, 'Saving…');
  try {
    const student = await api('/api/me/path', { method: 'PUT', body });
    setSession(null, student);
    location.replace('/dashboard.html');
  } catch (error) {
    busy(button, false);
    showAlert('branchError', fieldError(error));
  }
}

newForm.addEventListener('submit', (event) => saveBranch(event, 'NEW_APPLICATION'));
renewalForm.addEventListener('submit', (event) => saveBranch(event, 'RENEWAL'));

if (requireAuth()) {
  init();
}
