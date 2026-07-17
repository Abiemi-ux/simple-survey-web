const errorBanner = document.getElementById("error-banner");
const formCard = document.getElementById("form-card");
const loadingState = document.getElementById("loading-state");
const stepLabel = document.getElementById("step-label");
const stepperProgress = document.getElementById("stepper-progress");
const stepContent = document.getElementById("step-content");
const backBtn = document.getElementById("back-btn");
const nextBtn = document.getElementById("next-btn");

let survey = null;
let questions = [];
let currentStepIndex = 0;
let submitted = false;

// answers[question.name] -> string, array of strings, or File/File[]
const answers = {};
const basicInfo = { full_name: "", email_address: "" };

function totalSteps() {
  // step 0 = basic info, 1..N = questions, N+1 = review
  return questions.length + 2;
}

function isReviewStep(index) {
  return index === totalSteps() - 1;
}

function parseQuestionElement(el) {
  const optionsEl = el.querySelector("options");
  const options = optionsEl
    ? Array.from(optionsEl.querySelectorAll("option")).map((o) => ({
        value: o.getAttribute("value"),
        label: (o.textContent || "").trim(),
      }))
    : [];

  const filePropsEl = el.querySelector("file_properties");

  return {
    id: el.getAttribute("id"),
    name: el.getAttribute("name"),
    type: el.getAttribute("type"),
    required: el.getAttribute("required") === "yes",
    text: textOf(el, "text"),
    description: textOf(el, "description"),
    allowMultiple: optionsEl ? optionsEl.getAttribute("multiple") === "yes" : false,
    options,
    fileFormat: filePropsEl ? filePropsEl.getAttribute("format") : "",
    maxFileSize: filePropsEl ? filePropsEl.getAttribute("max_file_size") : "",
    fileMultiple: filePropsEl ? filePropsEl.getAttribute("multiple") === "yes" : false,
  };
}

async function loadSurvey() {
  try {
    const surveyDoc = await apiRequest(`${API_BASE}/surveys/${SURVEY_ID}`);
    survey = {
      id: surveyDoc.documentElement.getAttribute("id"),
      name: textOf(surveyDoc.documentElement, "name"),
      description: textOf(surveyDoc.documentElement, "description"),
    };
    document.getElementById("survey-name-heading").textContent = survey.name;

    const questionsDoc = await apiRequest(`${API_BASE}/surveys/${SURVEY_ID}/questions`);
    questions = Array.from(questionsDoc.querySelectorAll("question")).map(parseQuestionElement);

    loadingState.style.display = "none";
    formCard.style.display = "block";
    renderStep(0);
  } catch (err) {
    loadingState.style.display = "none";
    showError(errorBanner, err.message);
  }
}

function renderProgress() {
  stepperProgress.innerHTML = "";
  for (let i = 0; i < totalSteps(); i++) {
    const dot = document.createElement("div");
    dot.className = "stepper-dot";
    if (i < currentStepIndex) dot.classList.add("done");
    if (i === currentStepIndex) dot.classList.add("current");
    stepperProgress.appendChild(dot);
  }
  if (isReviewStep(currentStepIndex)) {
    stepLabel.textContent = "Review your answers";
  } else if (currentStepIndex === 0) {
    stepLabel.textContent = `Step 1 of ${totalSteps()} — About you`;
  } else {
    stepLabel.textContent = `Step ${currentStepIndex + 1} of ${totalSteps()}`;
  }
}

function fieldErrorEl() {
  const el = document.createElement("div");
  el.className = "field-error";
  el.id = "current-field-error";
  return el;
}

function showFieldError(message) {
  const el = document.getElementById("current-field-error");
  if (el) {
    el.textContent = message;
    el.classList.add("visible");
  }
}

function clearFieldError() {
  const el = document.getElementById("current-field-error");
  if (el) el.classList.remove("visible");
}

function renderBasicInfoStep() {
  const wrap = document.createElement("div");
  wrap.className = "question-card";
  wrap.innerHTML = `
    <h2>A little about you</h2>
    <p class="helper-text">We'll use this to identify your response.</p>
    <div class="form-row">
      <label for="input-full-name">Full name</label>
      <input type="text" id="input-full-name" value="${escapeXml(basicInfo.full_name)}">
    </div>
    <div class="form-row">
      <label for="input-email">Email address</label>
      <input type="email" id="input-email" value="${escapeXml(basicInfo.email_address)}">
    </div>
  `;
  wrap.appendChild(fieldErrorEl());
  stepContent.appendChild(wrap);
}

function renderQuestionStep(question) {
  const wrap = document.createElement("div");
  wrap.className = "question-card";

  const heading = document.createElement("h2");
  heading.textContent = question.text + (question.required ? " *" : "");
  wrap.appendChild(heading);

  if (question.description) {
    const helper = document.createElement("p");
    helper.className = "helper-text";
    helper.textContent = question.description;
    wrap.appendChild(helper);
  }

  if (question.type === "short_text" || question.type === "email") {
    const input = document.createElement("input");
    input.type = question.type === "email" ? "email" : "text";
    input.id = "current-input";
    input.value = answers[question.name] || "";
    wrap.appendChild(input);
  } else if (question.type === "long_text") {
    const textarea = document.createElement("textarea");
    textarea.id = "current-input";
    textarea.value = answers[question.name] || "";
    wrap.appendChild(textarea);
  } else if (question.type === "choice") {
    const group = document.createElement("div");
    group.className = question.allowMultiple ? "checkbox-group" : "radio-group";
    const selected = answers[question.name] || (question.allowMultiple ? [] : "");

    question.options.forEach((opt) => {
      const label = document.createElement("label");
      label.className = question.allowMultiple ? "checkbox-option" : "radio-option";

      const input = document.createElement("input");
      input.type = question.allowMultiple ? "checkbox" : "radio";
      input.name = "current-choice";
      input.value = opt.value;
      input.className = "current-choice-input";
      if (question.allowMultiple) {
        input.checked = selected.includes(opt.value);
      } else {
        input.checked = selected === opt.value;
      }

      const span = document.createElement("span");
      span.textContent = opt.label;

      label.appendChild(input);
      label.appendChild(span);
      group.appendChild(label);
    });
    wrap.appendChild(group);
  } else if (question.type === "file") {
    const drop = document.createElement("div");
    drop.className = "file-drop";
    const hint = document.createElement("div");
    const sizeHint = question.maxFileSize ? ` · up to ${question.maxFileSize}MB each` : "";
    hint.textContent = `Accepted: ${question.fileFormat || "any"}${sizeHint}`;
    drop.appendChild(hint);

    const input = document.createElement("input");
    input.type = "file";
    input.id = "current-input";
    if (question.fileMultiple) input.multiple = true;
    if (question.fileFormat) input.accept = question.fileFormat;
    drop.appendChild(input);

    const list = document.createElement("ul");
    list.className = "file-list";
    list.id = "current-file-list";
    const existing = answers[question.name];
    if (existing && existing.length) {
      Array.from(existing).forEach((f) => {
        const li = document.createElement("li");
        li.textContent = f.name;
        list.appendChild(li);
      });
    }
    drop.appendChild(list);

    input.addEventListener("change", () => {
      list.innerHTML = "";
      Array.from(input.files).forEach((f) => {
        const li = document.createElement("li");
        li.textContent = f.name;
        list.appendChild(li);
      });
    });

    wrap.appendChild(drop);
  }

  wrap.appendChild(fieldErrorEl());
  stepContent.appendChild(wrap);
}

function formatAnswerForReview(question) {
  const value = answers[question.name];
  if (question.type === "file") {
    if (!value || !value.length) return "—";
    return Array.from(value).map((f) => f.name).join(", ");
  }
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    const labels = value.map((v) => {
      const opt = question.options.find((o) => o.value === v);
      return opt ? opt.label : v;
    });
    return labels.join(", ");
  }
  if (question.type === "choice") {
    const opt = question.options.find((o) => o.value === value);
    return opt ? opt.label : (value || "—");
  }
  return value || "—";
}

function renderReviewStep() {
  const wrap = document.createElement("div");
  wrap.className = "question-card";
  wrap.innerHTML = `<h2>Review your answers</h2><p class="helper-text">Double check everything before submitting.</p>`;

  const table = document.createElement("table");
  table.className = "review-table";
  const tbody = document.createElement("tbody");

  const addRow = (label, value) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = label;
    const td = document.createElement("td");
    td.textContent = value;
    tr.appendChild(th);
    tr.appendChild(td);
    tbody.appendChild(tr);
  };

  addRow("Full name", basicInfo.full_name || "—");
  addRow("Email address", basicInfo.email_address || "—");
  questions.forEach((q) => addRow(q.text, formatAnswerForReview(q)));

  table.appendChild(tbody);
  wrap.appendChild(table);
  wrap.appendChild(fieldErrorEl());
  stepContent.appendChild(wrap);
}

function renderStep(index) {
  currentStepIndex = index;
  stepContent.innerHTML = "";
  renderProgress();

  if (index === 0) {
    renderBasicInfoStep();
  } else if (isReviewStep(index)) {
    renderReviewStep();
  } else {
    renderQuestionStep(questions[index - 1]);
  }

  backBtn.style.display = index === 0 ? "none" : "inline-flex";
  nextBtn.textContent = isReviewStep(index) ? "Submit" : "Next";
}

function captureCurrentStep() {
  if (currentStepIndex === 0) {
    basicInfo.full_name = document.getElementById("input-full-name").value.trim();
    basicInfo.email_address = document.getElementById("input-email").value.trim();
    return;
  }
  if (isReviewStep(currentStepIndex)) return;

  const question = questions[currentStepIndex - 1];
  if (question.type === "short_text" || question.type === "email" || question.type === "long_text") {
    answers[question.name] = document.getElementById("current-input").value.trim();
  } else if (question.type === "choice") {
    const checked = Array.from(document.querySelectorAll(".current-choice-input:checked")).map((i) => i.value);
    answers[question.name] = question.allowMultiple ? checked : (checked[0] || "");
  } else if (question.type === "file") {
    const input = document.getElementById("current-input");
    if (input.files && input.files.length) {
      answers[question.name] = input.files;
    }
  }
}

function validateCurrentStep() {
  clearFieldError();

  if (currentStepIndex === 0) {
    if (!basicInfo.full_name) {
      showFieldError("Please enter your full name.");
      return false;
    }
    if (!basicInfo.email_address || !basicInfo.email_address.includes("@")) {
      showFieldError("Please enter a valid email address.");
      return false;
    }
    return true;
  }

  if (isReviewStep(currentStepIndex)) return true;

  const question = questions[currentStepIndex - 1];
  if (!question.required) return true;

  const value = answers[question.name];
  const isEmpty =
    question.type === "file"
      ? !value || !value.length
      : Array.isArray(value)
      ? value.length === 0
      : !value;

  if (isEmpty) {
    showFieldError("This field is required.");
    return false;
  }
  return true;
}

async function submitResponse() {
  nextBtn.disabled = true;
  nextBtn.textContent = "Submitting…";
  try {
    const formData = new FormData();
    formData.append("full_name", basicInfo.full_name);
    formData.append("email_address", basicInfo.email_address);

    questions.forEach((question) => {
      const value = answers[question.name];
      if (question.type === "file") {
        if (value && value.length) {
          Array.from(value).forEach((file) => formData.append(question.name, file));
        }
      } else if (Array.isArray(value)) {
        value.forEach((v) => formData.append(question.name, v));
      } else if (value !== undefined) {
        formData.append(question.name, value);
      }
    });

    await apiRequest(`${API_BASE}/surveys/${SURVEY_ID}/responses`, {
      method: "POST",
      body: formData,
    });

    submitted = true;
    showConfirmation();
  } catch (err) {
    nextBtn.disabled = false;
    nextBtn.textContent = "Submit";
    showError(errorBanner, err.message);
  }
}

function showConfirmation() {
  stepperProgress.style.display = "none";
  stepLabel.style.display = "none";
  backBtn.style.display = "none";
  nextBtn.style.display = "none";
  stepContent.innerHTML = `
    <div class="confirmation-box">
      <div class="icon">✓</div>
      <h2>Thanks, ${escapeXml(basicInfo.full_name)}!</h2>
      <p>Your response to "${escapeXml(survey.name)}" has been submitted.</p>
    </div>
  `;
}

backBtn.addEventListener("click", () => {
  captureCurrentStep();
  renderStep(currentStepIndex - 1);
});

nextBtn.addEventListener("click", () => {
  captureCurrentStep();
  if (!validateCurrentStep()) return;

  if (isReviewStep(currentStepIndex)) {
    submitResponse();
    return;
  }
  renderStep(currentStepIndex + 1);
});

loadSurvey();