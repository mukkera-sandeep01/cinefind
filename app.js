const API = "https://api.themoviedb.org/3";
const IMAGE = "https://image.tmdb.org/t/p/w500";
const KEY_STORAGE = "tmdb_api_key";

const els = {
  form: document.getElementById("search-form"),
  query: document.getElementById("query"),
  grid: document.getElementById("grid"),
  empty: document.getElementById("empty"),
  status: document.getElementById("status"),
  sort: document.getElementById("sort"),
  minRating: document.getElementById("min-rating"),
  minRatingValue: document.getElementById("min-rating-value"),
  pagination: document.getElementById("pagination"),
  pageLabel: document.getElementById("page-label"),
  prev: document.getElementById("prev-page"),
  next: document.getElementById("next-page"),
  detailsDialog: document.getElementById("details-dialog"),
  detailsBody: document.getElementById("details-body"),
  keyDialog: document.getElementById("key-dialog"),
  keyInput: document.getElementById("api-key-input"),
  keyBtn: document.getElementById("api-key-btn"),
  saveKey: document.getElementById("save-key"),
  cancelKey: document.getElementById("cancel-key"),
};

const state = {
  query: "",
  page: 1,
  totalPages: 1,
  results: [],
  debounce: null,
};

function getKey() {
  return localStorage.getItem(KEY_STORAGE)?.trim() || "";
}

function requireKey() {
  if (getKey()) return true;
  els.keyInput.value = "";
  els.keyDialog.showModal();
  return false;
}

async function tmdb(path, params = {}) {
  const url = new URL(`${API}${path}`);
  url.searchParams.set("api_key", getKey());
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.status_message || `TMDB error ${res.status}`);
  }
  return res.json();
}

function yearOf(date) {
  return date ? date.slice(0, 4) : "TBA";
}

function posterUrl(path) {
  return path
    ? `${IMAGE}${path}`
    : "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect fill="#1c2233" width="400" height="600"/><text x="200" y="300" fill="#9aa3b8" text-anchor="middle" font-family="sans-serif" font-size="22">No poster</text></svg>`
        );
}

function sortResults(movies) {
  const copy = [...movies];
  switch (els.sort.value) {
    case "date-desc":
      return copy.sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
    case "date-asc":
      return copy.sort((a, b) => (a.release_date || "").localeCompare(b.release_date || ""));
    case "rating-desc":
      return copy.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    case "rating-asc":
      return copy.sort((a, b) => (a.vote_average || 0) - (b.vote_average || 0));
    default:
      return copy;
  }
}

function render() {
  const min = Number(els.minRating.value);
  const movies = sortResults(state.results).filter((m) => (m.vote_average || 0) >= min);

  els.grid.innerHTML = "";
  els.empty.classList.toggle("hidden", movies.length > 0);
  els.pagination.hidden = state.totalPages <= 1;

  movies.forEach((movie) => {
    const card = document.createElement("button");
    card.className = "card";
    card.type = "button";
    card.innerHTML = `
      <img class="poster" alt="${escapeHtml(movie.title)} poster" src="${posterUrl(movie.poster_path)}" />
      <div class="card-body">
        <h2>${escapeHtml(movie.title)}</h2>
        <div class="meta">
          <span>${yearOf(movie.release_date)}</span>
          <span class="rating">★ ${movie.vote_average?.toFixed(1) ?? "n/a"}</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => openDetails(movie.id));
    els.grid.appendChild(card);
  });

  els.pageLabel.textContent = `Page ${state.page} of ${state.totalPages}`;
  els.prev.disabled = state.page <= 1;
  els.next.disabled = state.page >= state.totalPages;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadMovies() {
  if (!requireKey()) return;
  const q = state.query.trim();
  els.status.textContent = "Loading…";
  try {
    const data = q
      ? await tmdb("/search/movie", { query: q, page: String(state.page) })
      : await tmdb("/movie/popular", { page: String(state.page) });
    state.results = data.results || [];
    state.totalPages = Math.min(data.total_pages || 1, 500);
    const label = q ? `Results for “${q}”` : "Popular movies";
    els.status.textContent = `${label} · ${data.total_results ?? 0} titles`;
    render();
  } catch (err) {
    els.status.textContent = err.message;
    state.results = [];
    state.totalPages = 1;
    render();
    els.empty.classList.add("hidden");
    if (/invalid api key/i.test(err.message)) {
      requireKey();
    }
  }
}

async function openDetails(id) {
  if (!requireKey()) return;
  els.detailsBody.innerHTML = "<p>Loading details…</p>";
  els.detailsDialog.showModal();
  try {
    const movie = await tmdb(`/movie/${id}`);
    const genres = (movie.genres || []).map((g) => g.name).join(", ") || "—";
    els.detailsBody.innerHTML = `
      <div class="details">
        <img alt="${escapeHtml(movie.title)} poster" src="${posterUrl(movie.poster_path)}" />
        <div>
          <h2>${escapeHtml(movie.title)}</h2>
          <p class="meta">
            <span>${yearOf(movie.release_date)} · ${movie.runtime ? `${movie.runtime} min` : "runtime n/a"}</span>
            <span class="rating">★ ${movie.vote_average?.toFixed(1) ?? "n/a"}</span>
          </p>
          <p>${escapeHtml(genres)}</p>
          <p>${escapeHtml(movie.overview || "No overview available.")}</p>
        </div>
      </div>
    `;
  } catch (err) {
    els.detailsBody.innerHTML = `<p>${escapeHtml(err.message)}</p>`;
  }
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  state.query = els.query.value;
  state.page = 1;
  loadMovies();
});

els.query.addEventListener("input", () => {
  clearTimeout(state.debounce);
  state.debounce = setTimeout(() => {
    state.query = els.query.value;
    state.page = 1;
    loadMovies();
  }, 400);
});

els.sort.addEventListener("change", render);
els.minRating.addEventListener("input", () => {
  els.minRatingValue.textContent = `${els.minRating.value}+`;
  render();
});

els.prev.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    loadMovies();
  }
});

els.next.addEventListener("click", () => {
  if (state.page < state.totalPages) {
    state.page += 1;
    loadMovies();
  }
});

els.keyBtn.addEventListener("click", () => {
  els.keyInput.value = getKey();
  els.keyDialog.showModal();
});

els.saveKey.addEventListener("click", () => {
  const key = els.keyInput.value.trim();
  if (!key) return;
  localStorage.setItem(KEY_STORAGE, key);
  els.keyDialog.close();
  loadMovies();
});

els.cancelKey.addEventListener("click", () => els.keyDialog.close());

if (getKey()) {
  loadMovies();
} else {
  requireKey();
}
