const errorBanner = document.getElementById("error-banner");
const gridEl = document.getElementById("survey-grid");

function renderCard(survey) {
  const card = document.createElement("div");
  card.className = "survey-card";

  const title = document.createElement("h3");
  title.textContent = survey.name;
  card.appendChild(title);

  const desc = document.createElement("p");
  desc.textContent = survey.description;
  card.appendChild(desc);

  const link = document.createElement("a");
  link.href = `/surveys/${survey.id}/take/`;
  link.className = "btn";
  link.textContent = "Take Survey";
  card.appendChild(link);

  return card;
}

async function loadSurveys() {
  try {
    const doc = await apiRequest(`${API_BASE}/surveys`);
    const surveyEls = Array.from(doc.querySelectorAll("survey"));
    gridEl.innerHTML = "";
    if (surveyEls.length === 0) {
      gridEl.innerHTML = `<div class="empty-state">No surveys are available right now.</div>`;
      return;
    }
    surveyEls.forEach((el) => {
      const survey = {
        id: el.getAttribute("id"),
        name: textOf(el, "name"),
        description: textOf(el, "description"),
      };
      gridEl.appendChild(renderCard(survey));
    });
  } catch (err) {
    showError(errorBanner, err.message);
  }
}

loadSurveys();