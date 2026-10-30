# CineFind — movie search

Single-page movie search app using [The Movie Database](https://www.themoviedb.org/) search API.

## Features

- Search by movie name (`/3/search/movie?api_key=...&query=Jack`)
- Pagination from TMDB (`page`)
- Sort the current page by release date or rating
- Filter by minimum rating
- Movie details dialog (`/3/movie/{id}`)
- Popular movies when the search box is empty

## Run locally

Python is enough (no Node build):

```bash
python -m http.server 5173
```

Open http://localhost:5173 and paste your TMDB API key when prompted. Get a key at [developers.themoviedb.org](https://developer.themoviedb.org/). The key stays in this browser’s local storage.

## Deploy on Netlify

1. Push this folder to GitHub, or drag the project folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
2. Publish directory: `.` (this is already set in `netlify.toml`).
3. After deploy, open the site and save your TMDB API key in the **API key** dialog.

The API key is a client-side key for this assignment. Anyone who uses the live site still enters their own key; it is not committed to the repo.
