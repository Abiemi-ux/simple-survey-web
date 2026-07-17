# Sky Survey Platform — Web

A Django + vanilla JavaScript frontend for the Sky Survey Platform. No
frontend framework or build step — plain templates, `fetch()`, and
`DOMParser` talking to the [Survey API](https://github.com/abiemi-ux/simple-survey-api)
over XML.

## Live Demo

- **Web app:** https://simple-survey-web.onrender.com/
- **Take a survey:** https://simple-survey-web.onrender.com/take-survey/
- **Admin login:** https://simple-survey-web.onrender.com/login/

> Hosted on Render's free tier alongside the [API](https://github.com/abiemi-ux/simple-survey-api)
> — the first request after idle time may take 30–60 seconds while both
> services wake up.

## Prerequisites

- Python 3.12+
- A running instance of [`simple-survey-api`](https://github.com/abiemi-ux/simple-survey-api)
  — this project has no database of its own; it's a pure client of the API
- `pip` and `venv`

## Installation

```bash
git clone 'this repo'
cd simple-survey-web

python -m venv venv
venv\Scripts\activate        # macOS/Linux: source venv/bin/activate

pip install -r requirements.txt
```

In `web/static/web/js/xml-utils.js`, confirm `API_BASE` points at wherever
the API is running:
```javascript
const API_BASE = "http://127.0.0.1:8000/api";
```

## Running locally

Make sure `simple-survey-api` is already running on port 8000, then:

```bash
python manage.py runserver 8001
```

- Public survey pages: `http://127.0.0.1:8001/take-survey/`
- Admin login: `http://127.0.0.1:8001/login/` (uses the same superuser
  account created in the API project's database)
  Username: admin
  Password: 12345678
- Admin pages (Survey Management, Question Management, Responses):
  `http://127.0.0.1:8001/surveys/`

## Technologies used

- Django (templates + routing only — no database/models of its own beyond
  what `django.contrib.auth` requires for login)
- Vanilla JavaScript — `fetch()` for API calls, `DOMParser` for parsing
  XML responses, no framework or build tooling
- Session-based auth shared with the API via cross-origin cookies
  (`credentials: "include"`, `CORS_ALLOW_CREDENTIALS`), with CSRF tokens
  attached to write requests

## Assumptions made

- This app assumes it's always paired with a running `simple-survey-api`
  instance on a known origin — it holds no survey data itself and will
  show fetch errors if the API is unreachable.
- Cross-origin session cookies require both apps to run on
  `127.0.0.1`/`localhost` with matching `CORS_ALLOWED_ORIGINS` — deploying
  the two to different real domains would need this auth approach
  reworked (e.g. token-based auth) rather than shared session cookies.
- Since login is shared with the API's Django superuser, there's no
  separate "web app account system" — anyone able to log into
  `/admin/` on the API can also log into this app's admin pages.
- The UI assumes a survey's questions don't change type after responses
  have been submitted against it — there's no migration/versioning
  handling for that edge case.