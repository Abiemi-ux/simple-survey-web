const errorBanner = document.getElementById("error-banner");
const rowsEl = document.getElementById("survey-rows");
const formCard = document.getElementById("survey-form-card");
const form = document.getElementById("survey-form");
const formTitle = document.getElementById("survey-form-title");
const idInput = document.getElementById("survey-id");
const nameInput = document.getElementById("survey-name");
const descInput = document.getElementById("survey-description");

function openForm(survey) {
  hideError(errorBanner);
  if (survey) {
    formTitle.textContent = "Edit Survey";
    idInput.value = survey.id;
    nameInput.value = survey.name;
    descInput.value = survey.description;
  } else {
    formTitle.textContent = "New Survey";
    idInput.value = "";
    nameInput.value = "";
    descInput.value = "";
  }
  formCard.style.display = "block";
  nameInput.focus();
}

function closeForm() {
  formCard.style.display = "none";
  form.reset();
}

function renderRow(survey) {
  const tr = document.createElement("tr");

  const nameTd = document.createElement("td");
  nameTd.textContent = survey.name;
  tr.appendChild(nameTd);

  const descTd = document.createElement("td");
  descTd.textContent = survey.description;
  tr.appendChild(descTd);

  const actionsTd = document.createElement("td");
  actionsTd.className = "actions";

  const questionsLink = document.createElement("a");
  questionsLink.href = `/surveys/${survey.id}/questions/`;
  questionsLink.className = "btn btn-secondary btn-sm";
  questionsLink.textContent = "Questions";
  actionsTd.appendChild(questionsLink);

  const responsesLink = document.createElement("a");
  responsesLink.href = `/surveys/${survey.id}/responses/`;
  responsesLink.className = "btn btn-secondary btn-sm";
  responsesLink.textContent = "Responses";
  actionsTd.appendChild(responsesLink);

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn-secondary btn-sm";
  editBtn.textContent = "Edit";
  editBtn.onclick = () => openForm(survey);
  actionsTd.appendChild(editBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-danger btn-sm";
  deleteBtn.textContent = "Delete";
  deleteBtn.onclick = () => deleteSurvey(survey.id);
  actionsTd.appendChild(deleteBtn);

  tr.appendChild(actionsTd);
  return tr;
}

async function loadSurveys() {
  try {
    const doc = await apiRequest(`${API_BASE}/surveys`);
    const surveyEls = Array.from(doc.querySelectorAll("survey"));
    rowsEl.innerHTML = "";
    if (surveyEls.length === 0) {
      rowsEl.innerHTML = `<tr><td colspan="3" class="empty-state">No surveys yet. Create your first one.</td></tr>`;
      return;
    }
    surveyEls.forEach((el) => {
      const survey = {
        id: el.getAttribute("id"),
        name: textOf(el, "name"),
        description: textOf(el, "description"),
      };
      rowsEl.appendChild(renderRow(survey));
    });
  } catch (err) {
    showError(errorBanner, err.message);
  }
}

async function deleteSurvey(id) {
  if (!confirm("Delete this survey and all its questions/responses?")) return;
  try {
    await apiRequest(`${API_BASE}/surveys/${id}`, { method: "DELETE" });
    loadSurveys();
  } catch (err) {
    showError(errorBanner, err.message);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = idInput.value;
  const xml = `<survey><name>${escapeXml(nameInput.value)}</name><description>${escapeXml(descInput.value)}</description></survey>`;

  try {
    if (id) {
      await apiRequest(`${API_BASE}/surveys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/xml" },
        body: xml,
      });
    } else {
      await apiRequest(`${API_BASE}/surveys`, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: xml,
      });
    }
    closeForm();
    loadSurveys();
  } catch (err) {
    showError(errorBanner, err.message);
  }
});

document.getElementById("new-survey-btn").addEventListener("click", () => openForm(null));
document.getElementById("cancel-survey-btn").addEventListener("click", closeForm);

loadSurveys();