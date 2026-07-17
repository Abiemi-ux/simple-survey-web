const errorBanner = document.getElementById("error-banner");
const rowsEl = document.getElementById("question-rows");
const formCard = document.getElementById("question-form-card");
const form = document.getElementById("question-form");
const formTitle = document.getElementById("question-form-title");
const idInput = document.getElementById("question-id");
const nameInput = document.getElementById("question-name");
const textInput = document.getElementById("question-text");
const descInput = document.getElementById("question-description");
const typeSelect = document.getElementById("question-type");
const requiredInput = document.getElementById("question-required");
const allowMultipleInput = document.getElementById("question-allow-multiple");
const choiceFields = document.getElementById("choice-fields");
const optionsList = document.getElementById("options-list");

function addOptionRow(value = "", label = "") {
  const row = document.createElement("div");
  row.className = "option-row";
  row.innerHTML = `
    <input type="text" class="option-value" placeholder="value (e.g. MALE)" value="${escapeXml(value)}">
    <input type="text" class="option-label" placeholder="label (e.g. Male)" value="${escapeXml(label)}">
    <button type="button" class="btn btn-secondary btn-sm remove-option-btn">✕</button>
  `;
  row.querySelector(".remove-option-btn").onclick = () => row.remove();
  optionsList.appendChild(row);
}

typeSelect.addEventListener("change", () => {
  choiceFields.style.display = typeSelect.value === "choice" ? "block" : "none";
});

function openForm(question) {
  hideError(errorBanner);
  optionsList.innerHTML = "";
  if (question) {
    formTitle.textContent = "Edit Question";
    idInput.value = question.id;
    nameInput.value = question.name;
    textInput.value = question.text;
    descInput.value = question.description;
    typeSelect.value = question.type;
    requiredInput.checked = question.required;
    allowMultipleInput.checked = question.allowMultiple;
    question.options.forEach((opt) => addOptionRow(opt.value, opt.label));
  } else {
    formTitle.textContent = "New Question";
    idInput.value = "";
    nameInput.value = "";
    textInput.value = "";
    descInput.value = "";
    typeSelect.value = "short_text";
    requiredInput.checked = true;
    allowMultipleInput.checked = false;
  }
  choiceFields.style.display = typeSelect.value === "choice" ? "block" : "none";
  if (typeSelect.value === "choice" && optionsList.children.length === 0) {
    addOptionRow();
  }
  formCard.style.display = "block";
  nameInput.focus();
}

function closeForm() {
  formCard.style.display = "none";
  form.reset();
  optionsList.innerHTML = "";
}

function renderRow(question) {
  const tr = document.createElement("tr");

  const orderTd = document.createElement("td");
  orderTd.textContent = question.order;
  tr.appendChild(orderTd);

  const nameTd = document.createElement("td");
  nameTd.textContent = question.name;
  tr.appendChild(nameTd);

  const typeTd = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = question.type;
  typeTd.appendChild(badge);
  tr.appendChild(typeTd);

  const requiredTd = document.createElement("td");
  requiredTd.textContent = question.required ? "Yes" : "No";
  tr.appendChild(requiredTd);

  const actionsTd = document.createElement("td");
  actionsTd.className = "actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn-secondary btn-sm";
  editBtn.textContent = "Edit";
  editBtn.onclick = () => openForm(question);
  actionsTd.appendChild(editBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-danger btn-sm";
  deleteBtn.textContent = "Delete";
  deleteBtn.onclick = () => deleteQuestion(question.id);
  actionsTd.appendChild(deleteBtn);

  tr.appendChild(actionsTd);
  return tr;
}

function questionFromElement(el, order) {
  const optionsEl = el.querySelector("options");
  const options = optionsEl
    ? Array.from(optionsEl.querySelectorAll("option")).map((o) => ({
        value: o.getAttribute("value"),
        label: (o.textContent || "").trim(),
      }))
    : [];
  return {
    id: el.getAttribute("id"),
    name: el.getAttribute("name"),
    type: el.getAttribute("type"),
    required: el.getAttribute("required") === "yes",
    text: textOf(el, "text"),
    description: textOf(el, "description"),
    allowMultiple: optionsEl ? optionsEl.getAttribute("multiple") === "yes" : false,
    options,
    order,
  };
}

async function loadSurveyName() {
  try {
    const doc = await apiRequest(`${API_BASE}/surveys/${SURVEY_ID}`);
    const name = textOf(doc.documentElement, "name");
    document.getElementById("survey-name-heading").textContent = `Questions — ${name}`;
  } catch (err) {
    showError(errorBanner, err.message);
  }
}

async function loadQuestions() {
  try {
    const doc = await apiRequest(`${API_BASE}/surveys/${SURVEY_ID}/questions`);
    const questionEls = Array.from(doc.querySelectorAll("question"));
    rowsEl.innerHTML = "";
    if (questionEls.length === 0) {
      rowsEl.innerHTML = `<tr><td colspan="5" class="empty-state">No questions yet. Add your first one.</td></tr>`;
      return;
    }
    questionEls.forEach((el, i) => {
      rowsEl.appendChild(renderRow(questionFromElement(el, i + 1)));
    });
  } catch (err) {
    showError(errorBanner, err.message);
  }
}

async function deleteQuestion(id) {
  if (!confirm("Delete this question?")) return;
  try {
    await apiRequest(`${API_BASE}/surveys/${SURVEY_ID}/questions/${id}`, { method: "DELETE" });
    loadQuestions();
  } catch (err) {
    showError(errorBanner, err.message);
  }
}

function buildQuestionXml() {
  const type = typeSelect.value;
  const required = requiredInput.checked ? "yes" : "no";
  let inner = `<text>${escapeXml(textInput.value)}</text><description>${escapeXml(descInput.value)}</description>`;

  if (type === "choice") {
    const multiple = allowMultipleInput.checked ? "yes" : "no";
    const optionRows = Array.from(optionsList.querySelectorAll(".option-row"));
    const options = optionRows
      .map((row) => {
        const value = row.querySelector(".option-value").value.trim();
        const label = row.querySelector(".option-label").value.trim();
        if (!value) return "";
        return `<option value="${escapeXml(value)}">${escapeXml(label || value)}</option>`;
      })
      .filter(Boolean)
      .join("");
    inner += `<options multiple="${multiple}">${options}</options>`;
  }

  return `<question name="${escapeXml(nameInput.value)}" type="${escapeXml(type)}" required="${required}">${inner}</question>`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = idInput.value;
  const xml = buildQuestionXml();

  try {
    if (id) {
      await apiRequest(`${API_BASE}/surveys/${SURVEY_ID}/questions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/xml" },
        body: xml,
      });
    } else {
      await apiRequest(`${API_BASE}/surveys/${SURVEY_ID}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: xml,
      });
    }
    closeForm();
    loadQuestions();
  } catch (err) {
    showError(errorBanner, err.message);
  }
});

document.getElementById("new-question-btn").addEventListener("click", () => openForm(null));
document.getElementById("cancel-question-btn").addEventListener("click", closeForm);
document.getElementById("add-option-btn").addEventListener("click", () => addOptionRow());

loadSurveyName();
loadQuestions();