const errorBanner = document.getElementById("error-banner");
const theadEl = document.getElementById("responses-thead");
const rowsEl = document.getElementById("responses-rows");
const emailFilterInput = document.getElementById("email-filter");
const filterBtn = document.getElementById("filter-btn");
const clearFilterBtn = document.getElementById("clear-filter-btn");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const paginationSummary = document.getElementById("pagination-summary");

const PAGE_SIZE = 10;

let questions = []; // [{name, text, type}]
let currentPage = 1;
let emailFilter = "";

function colspan() {
  // Response ID, Full Name, Email + one per question + Date Responded
  return 4 + questions.length;
}

function parseQuestionElement(el) {
  return {
    name: el.getAttribute("name"),
    text: textOf(el, "text"),
    type: el.getAttribute("type"),
  };
}

function renderHeaders() {
  const tr = document.createElement("tr");
  ["Response ID", "Full Name", "Email"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    tr.appendChild(th);
  });
  questions.forEach((q) => {
    const th = document.createElement("th");
    th.textContent = q.text;
    tr.appendChild(th);
  });
  const dateTh = document.createElement("th");
  dateTh.textContent = "Date Responded";
  tr.appendChild(dateTh);

  theadEl.innerHTML = "";
  theadEl.appendChild(tr);
}

function cellForQuestion(responseEl, question) {
  const wrapper = responseEl.querySelector(question.name);

  if (question.type === "file") {
    const certs = wrapper ? Array.from(wrapper.querySelectorAll("certificate")) : [];
    if (certs.length === 0) return "—";
    const container = document.createElement("div");
    container.className = "cert-links";
    certs.forEach((cert) => {
      const link = document.createElement("a");
      link.href = `${API_BASE}/certificates/${cert.getAttribute("id")}`;
      link.textContent = (cert.textContent || "").trim() || "Download";
      container.appendChild(link);
    });
    return container;
  }

  const raw = wrapper ? (wrapper.textContent || "").trim() : "";
  return raw ? raw.replace(/,/g, ", ") : "—";
}

function renderRow(responseEl) {
  const tr = document.createElement("tr");

  const addTextCell = (value) => {
    const td = document.createElement("td");
    td.textContent = value;
    tr.appendChild(td);
  };

  addTextCell(textOf(responseEl, "response_id") || "—");
  addTextCell(textOf(responseEl, "full_name") || "—");
  addTextCell(textOf(responseEl, "email_address") || "—");

  questions.forEach((q) => {
    const td = document.createElement("td");
    const value = cellForQuestion(responseEl, q);
    if (typeof value === "string") {
      td.textContent = value;
    } else {
      td.appendChild(value);
    }
    tr.appendChild(td);
  });

  addTextCell(textOf(responseEl, "date_responded") || "—");

  return tr;
}

async function loadSurveyMeta() {
  const surveyDoc = await apiRequest(`${API_BASE}/surveys/${SURVEY_ID}`);
  const name = textOf(surveyDoc.documentElement, "name");
  document.getElementById("survey-name-heading").textContent = `Responses — ${name}`;

  const questionsDoc = await apiRequest(`${API_BASE}/surveys/${SURVEY_ID}/questions`);
  questions = Array.from(questionsDoc.querySelectorAll("question")).map(parseQuestionElement);
  renderHeaders();
}

async function loadResponses() {
  try {
    const params = new URLSearchParams({ page: String(currentPage), pageSize: String(PAGE_SIZE) });
    if (emailFilter) params.set("email", emailFilter);

    const doc = await apiRequest(`${API_BASE}/surveys/${SURVEY_ID}/responses?${params.toString()}`);
    const root = doc.documentElement;
    const totalCount = parseInt(root.getAttribute("total_count") || "0", 10);
    const lastPage = parseInt(root.getAttribute("last_page") || "1", 10);
    const page = parseInt(root.getAttribute("current_page") || "1", 10);

    const responseEls = Array.from(doc.querySelectorAll("question_response"));
    rowsEl.innerHTML = "";

    if (responseEls.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = colspan();
      td.className = "empty-state";
      td.textContent = emailFilter ? "No responses match that email." : "No responses yet.";
      tr.appendChild(td);
      rowsEl.appendChild(tr);
    } else {
      responseEls.forEach((el) => rowsEl.appendChild(renderRow(el)));
    }

    paginationSummary.textContent = totalCount === 0
      ? "0 responses"
      : `Page ${page} of ${lastPage} · ${totalCount} response${totalCount === 1 ? "" : "s"} total`;

    prevPageBtn.disabled = page <= 1;
    nextPageBtn.disabled = page >= lastPage;
  } catch (err) {
    showError(errorBanner, err.message);
  }
}

filterBtn.addEventListener("click", () => {
  emailFilter = emailFilterInput.value.trim();
  currentPage = 1;
  loadResponses();
});

emailFilterInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    filterBtn.click();
  }
});

clearFilterBtn.addEventListener("click", () => {
  emailFilterInput.value = "";
  emailFilter = "";
  currentPage = 1;
  loadResponses();
});

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    loadResponses();
  }
});

nextPageBtn.addEventListener("click", () => {
  currentPage += 1;
  loadResponses();
});

(async function init() {
  try {
    await loadSurveyMeta();
    await loadResponses();
  } catch (err) {
    showError(errorBanner, err.message);
  }
})();