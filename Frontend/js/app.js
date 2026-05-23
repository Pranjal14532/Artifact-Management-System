const API_URL = window.location.origin + '/api';
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
const username = localStorage.getItem('username');
let pendingSuggestionId = null;

if (!token) window.location.href = 'index.html';

document.addEventListener('DOMContentLoaded', () => {
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.innerText = `Logged in as: ${username} (${role})`;

    if (role === 'admin') {
        const adminActions = document.getElementById('adminActions');
        if (adminActions) adminActions.style.display = 'flex';
    } else {
        const viewerActions = document.getElementById('viewerActions');
        if (viewerActions) viewerActions.style.display = 'flex';
    }

    init();
    attachEventListeners();
    applyTheme();
    generateStars();
});

function applyTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') document.body.classList.add('light-mode');
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    generateStars(); // Re-generate stars with new colors
}

function generateStars() {
    const stars = document.getElementById('stars');
    if (!stars) return;
    const isLight = document.body.classList.contains('light-mode');
    const starColor = isLight ? '#2563eb' : '#FFF';
    let shadow = "";
    for (let i = 0; i < 700; i++) {
        shadow += `${Math.random() * 2000}px ${Math.random() * 2000}px ${starColor}${i < 699 ? "," : ""}`;
    }
    stars.style.boxShadow = shadow;
}

// Utility Functions
function showLoading() { document.getElementById('spinner').style.display = 'flex'; }
function hideLoading() { document.getElementById('spinner').style.display = 'none'; }

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openModal(id, fromSuggestion = false) {
    if (!fromSuggestion) pendingSuggestionId = null;
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
    if (id === 'artifactModal') {
        document.getElementById('artifactModalTitle').innerText = 'Add New Artifact';
        if (!fromSuggestion) document.getElementById('artifactForm').reset();
        document.getElementById('editArtifactId').value = '';
    }
    if (id === 'exhibitionModal') {
        if (!fromSuggestion) document.getElementById('exhibitionForm').reset();
    }
    if (id === 'museumModal') {
        document.getElementById('museumModalTitle').innerText = 'Add Museum';
        document.getElementById('museumForm').reset();
        document.getElementById('editMuseumId').value = '';
    }
    if (id === 'suggestionModal') {
        document.getElementById('suggestionForm').reset();
        loadSuggestionMuseums();
    }
    if (id === 'reviewModal') {
        loadSuggestions();
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function openFeedbackModal(exhibitionId, exhibitionName) {
    const modal = document.getElementById('feedbackModal');
    if (!modal) return;
    
    document.getElementById('feedbackExhibitionId').value = exhibitionId;
    document.getElementById('feedbackExhibitionName').innerText = `Exhibition: ${exhibitionName}`;
    document.getElementById('feedbackForm').reset();
    
    // Set max date for visited_date input to today so they cannot select a future date
    const today = new Date().toISOString().split('T')[0];
    const visitedDateInput = document.querySelector('#feedbackForm [name="visited_date"]');
    if (visitedDateInput) {
        visitedDateInput.setAttribute('max', today);
        visitedDateInput.value = today; // Default to today
    }
    
    openModal('feedbackModal');
}


// Initialization
async function init() {
    showLoading();
    try {
        // Run independently so one failure doesn't block others
        loadArtifacts().catch(e => console.error('Artifacts failed:', e));
        loadExhibitions().catch(e => console.error('Exhibitions failed:', e));
        loadMuseums().catch(e => console.error('Museums failed:', e));
        loadFilters().catch(e => console.error('Filters failed:', e));
    } catch (err) {
        console.error('Initialization error:', err);
    } finally {
        hideLoading();
    }
}

async function loadFilters() {
    try {
        const [countries, periods, museums, materials] = await Promise.all([
            fetch(`${API_URL}/misc/countries`).then(r => r.json()),
            fetch(`${API_URL}/misc/periods`).then(r => r.json()),
            fetch(`${API_URL}/misc/museums`).then(r => r.json()),
            fetch(`${API_URL}/misc/materials`).then(r => r.json())
        ]);

        if (Array.isArray(countries)) {
            const filterCountry = document.getElementById('filterCountry');
            const formCountry = document.getElementById('formCountry');
            if (filterCountry) {
                filterCountry.innerHTML = '<option value="">All Countries</option>';
                countries.forEach(c => filterCountry.innerHTML += `<option value="${c.name}">${c.name}</option>`);
            }
            if (formCountry) {
                formCountry.innerHTML = countries.map(c => `<option value="${c.country_id}">${c.name}</option>`).join('');
            }
        }

        if (Array.isArray(periods)) {
            const filterPeriod = document.getElementById('filterPeriod');
            const formPeriod = document.getElementById('formPeriod');
            if (filterPeriod) {
                filterPeriod.innerHTML = '<option value="">All Periods</option>';
                periods.forEach(p => filterPeriod.innerHTML += `<option value="${p.name}">${p.name}</option>`);
            }
            if (formPeriod) {
                formPeriod.innerHTML = periods.map(p => `<option value="${p.period_id}">${p.name}</option>`).join('');
            }
        }

        if (Array.isArray(museums)) {
            const formMuseum = document.getElementById('formMuseum');
            const exMuseum = document.getElementById('exMuseum');
            const options = museums.map(m => `<option value="${m.museum_id}">${m.name}</option>`).join('');
            if (formMuseum) formMuseum.innerHTML = options;
            if (exMuseum) exMuseum.innerHTML = options;
        }

        // Populate museum form country dropdown
        if (Array.isArray(countries)) {
            const museumFormCountry = document.getElementById('museumFormCountry');
            if (museumFormCountry) {
                museumFormCountry.innerHTML = '<option value="">-- Select Country --</option>' +
                    countries.map(c => `<option value="${c.country_id}">${c.name}</option>`).join('');
            }
        }

        if (Array.isArray(materials)) {
            const filterMaterial = document.getElementById('filterMaterial');
            if (filterMaterial) {
                filterMaterial.innerHTML = '<option value="">All Materials</option>';
                materials.forEach(m => filterMaterial.innerHTML += `<option value="${m}">${m}</option>`);
            }
        }
    } catch (err) {
        console.error('Error loading filters:', err);
    }
}

async function loadArtifacts() {
    try {
        const country = document.getElementById('filterCountry')?.value || '';
        const period = document.getElementById('filterPeriod')?.value || '';
        const material = document.getElementById('filterMaterial')?.value || '';
        const search = document.getElementById('searchBar')?.value || '';
        const sort = document.getElementById('sortArtifacts')?.value || 'name_asc';

        let url = `${API_URL}/artifacts?limit=50&`;
        if (country) url += `country=${encodeURIComponent(country)}&`;
        if (period) url += `period=${encodeURIComponent(period)}&`;
        if (material) url += `material=${encodeURIComponent(material)}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;

        const [sortField, sortOrder] = sort.split('_');
        url += `sort=${sortField}&order=${sortOrder}`;

        const res = await fetch(url);
        const result = await res.json();
        const artifacts = result.data || [];

        const grid = document.getElementById('artifactGrid');
        if (grid) {
            grid.innerHTML = '';
            artifacts.forEach((a, index) => {
                const card = document.createElement('div');
                card.className = 'artifact-card glass fade-in';
                card.style.animationDelay = `${index * 0.05}s`;
                card.onclick = () => showDetail(a);

                const materials = a.materials ? a.materials.split(',').map(m => `<span class="badge">${m}</span>`).join('') : '';
                card.innerHTML = `
                    <div class="artifact-img" style="background-image: url('${API_URL.replace('/api', '')}${a.image_path || '/placeholder.jpg'}')"></div>
                    <div class="artifact-info">
                        <h4>${a.name}</h4>
                        <p><strong>Age:</strong> ${a.age} years</p>
                        <p><strong>Country:</strong> ${a.country_name}</p>
                        <div style="margin-top: 10px;">${materials}</div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        const exArtifacts = document.getElementById('exArtifacts');
        if (exArtifacts) {
            exArtifacts.innerHTML = artifacts.map(a => `<option value="${a.artifact_id}">${a.name}</option>`).join('');
        }
    } catch (err) {
        console.error('Error loading artifacts:', err);
    }
}

function showDetail(a) {
    const title = document.getElementById('detailTitle');
    const body = document.getElementById('detailBody');
    if (!title || !body) return;

    title.innerText = a.name;
    const materialsArr = a.materials ? a.materials.split(',') : [];
    const materialsHtml = materialsArr.map(m => {
        const removeBtn = role === 'admin' ? `<span style="cursor:pointer; color:#ff4d4d; margin-left:5px;" onclick="event.stopPropagation(); removeMaterial(${a.artifact_id}, '${m.trim()}')">&times;</span>` : '';
        return `<span class="badge">${m}${removeBtn}</span>`;
    }).join('');

    const exhibitions = a.exhibitions && a.exhibitions.length > 0 ? `<p><strong>Part of Exhibitions:</strong> ${a.exhibitions.join(', ')}</p>` : '<p>Not currently in any exhibition.</p>';

    body.innerHTML = `
        <div style="border-radius: 12px; overflow: hidden; background: #000; box-shadow: 0 0 30px rgba(0,0,0,0.5);">
            <img src="${API_URL.replace('/api', '')}${a.image_path || '/placeholder.jpg'}" style="width: 100%; height: auto; display: block;">
        </div>
        <div>
            <p style="font-size: 1.1rem; margin-bottom: 20px; color: var(--text-muted)">${a.description || 'No description available for this treasure.'}</p>
            <div style="display: grid; gap: 15px;">
                <p><strong>Age:</strong> ${a.age} years</p>
                <p><strong>Origin:</strong> ${a.country_name}</p>
                <p><strong>Period:</strong> ${a.period_name}</p>
                <p><strong>Location:</strong> ${a.museum_name}</p>
                <div><strong>Materials:</strong><br>${materialsHtml}</div>
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--glass-border);">
                    ${exhibitions}
                </div>
                ${role === 'admin' ? `
                    <div style="margin-top: 30px; display: flex; gap: 10px;">
                        <button class="btn-primary" style="background: var(--accent);" onclick="prepareEditArtifact(${JSON.stringify(a).replace(/"/g, '&quot;')})">EDIT ARTIFACT</button>
                        <button class="btn-primary" style="background: #ff4d4d; color: white;" onclick="deleteArtifact(${a.artifact_id}, '${a.name.replace(/'/g, "\\'")}')">DELETE ARTIFACT</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    openModal('detailModal');
}

function prepareEditArtifact(a) {
    closeModal('detailModal');
    openModal('artifactModal');
    document.getElementById('artifactModalTitle').innerText = 'Edit Artifact';

    const form = document.getElementById('artifactForm');
    form.name.value = a.name;
    form.age.value = a.age;
    form.country_id.value = a.country_id;
    form.period_id.value = a.period_id;
    form.museum_id.value = a.museum_id;
    form.materials.value = a.materials || '';
    form.description.value = a.description || '';
    document.getElementById('editArtifactId').value = a.artifact_id;
}

async function removeMaterial(artifactId, material) {
    if (!confirm(`Are you sure you want to remove the material "${material}"?`)) return;

    try {
        const res = await fetch(`${API_URL}/artifacts/${artifactId}/materials/${material}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showToast('Material removed');
            closeModal('detailModal');
            loadArtifacts();
        } else {
            showToast('Failed to remove material', 'error');
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteArtifact(id, name) {
    if (!confirm(`Are you sure you want to PERMANENTLY delete "${name}"? This cannot be undone.`)) return;

    showLoading();
    try {
        const res = await fetch(`${API_URL}/artifacts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showToast(`"${name}" deleted successfully`);
            closeModal('detailModal');
            loadArtifacts();
        } else {
            const err = await res.json();
            showToast(err.message || 'Failed to delete artifact', 'error');
        }
    } catch (err) {
        showToast('Server connection error', 'error');
    } finally {
        hideLoading();
    }
}

async function loadExhibitions() {
    try {
        const res = await fetch(`${API_URL}/exhibitions`);
        const exhibitions = await res.json();
        const grid = document.getElementById('exhibitionGrid');
        if (!grid || !Array.isArray(exhibitions)) return;

        grid.innerHTML = '';
        exhibitions.forEach(e => {
            const card = document.createElement('div');
            card.className = 'artifact-card glass fade-in';
            card.onclick = () => showExhibitionDetail(e);

            const deleteBtn = role === 'admin' ? `<button class="btn-primary" style="background: rgba(255,77,77,0.2); color: #ff4d4d; border: 1px solid #ff4d4d; padding: 5px 10px; font-size: 0.75rem; margin-top: 10px;" onclick="event.stopPropagation(); deleteExhibition(${e.exhibition_id})">DELETE</button>` : '';
            const feedbackBtn = role === 'viewer' ? `<button class="btn-primary" style="background: rgba(52,211,153,0.2); color: #34d399; border: 1px solid #34d399; padding: 5px 10px; font-size: 0.75rem; margin-top: 10px;" onclick="event.stopPropagation(); openFeedbackModal(${e.exhibition_id}, '${e.name.replace(/'/g, "\\'")}')">GIVE FEEDBACK</button>` : '';
            card.innerHTML = `
                <div class="artifact-info">
                    <h4 style="color: var(--accent)">${e.name}</h4>
                    <p><strong>Museum:</strong> ${e.museum_name}</p>
                    <p><strong>Start:</strong> ${new Date(e.start_date).toLocaleDateString()}</p>
                    <p><strong>End:</strong> ${new Date(e.end_date).toLocaleDateString()}</p>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${deleteBtn}
                        ${feedbackBtn}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading exhibitions:', err);
    }
}

async function showExhibitionDetail(e) {
    showLoading();
    try {
        // Fetch artifacts for this specific exhibition
        const res = await fetch(`${API_URL}/exhibitions`);
        const allEx = await res.json();
        const thisEx = allEx.find(ex => ex.exhibition_id === e.exhibition_id);

        const grid = document.getElementById('artifactGrid'); // Just for data
        const resArt = await fetch(`${API_URL}/artifacts?limit=100`);
        const allArt = (await resArt.json()).data || [];

        // This is a bit inefficient since we don't have a specific endpoint for ex-artifacts
        // but we can filter from all artifacts if they have the exhibition name in their exhibitions array
        const artifacts = allArt.filter(a => a.exhibitions && a.exhibitions.includes(e.name));

        // Fetch feedback for this exhibition
        const resFeedback = await fetch(`${API_URL}/exhibitions/${e.exhibition_id}/feedback`);
        const feedbacks = await resFeedback.json();

        let feedbackHtml = '<div style="max-height: 250px; overflow-y: auto; padding-right: 5px;">';
        if (Array.isArray(feedbacks) && feedbacks.length > 0) {
            feedbackHtml += feedbacks.map(f => `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
                        <span style="font-weight: 600; color: var(--accent); font-size: 0.9rem;">${f.user_name || 'Anonymous'}</span>
                        <span style="color: #fbbf24; font-size: 0.8rem;">${'⭐'.repeat(f.rating)}</span>
                    </div>
                    <p style="margin: 0 0 6px 0; font-size: 0.85rem; color: var(--text-color);">${f.comments || '<i>No comments left.</i>'}</p>
                    <div style="font-size: 0.7rem; color: var(--text-muted); display: flex; justify-content: space-between;">
                        <span>Visited: ${new Date(f.visited_date).toLocaleDateString()}</span>
                        <span>Posted: ${new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');
        } else {
            feedbackHtml += '<p style="color: var(--text-muted); font-size: 0.9rem;">No feedback left for this exhibition yet.</p>';
        }
        feedbackHtml += '</div>';

        document.getElementById('exDetailTitle').innerText = e.name;
        const body = document.getElementById('exDetailBody');

        let artifactsHtml = '<div style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 15px;">';
        if (artifacts.length > 0) {
            artifactsHtml += artifacts.map(a => `
                <div class="ex-artifact-thumb" style="background-image: url('http://localhost:3000${a.image_path || '/placeholder.jpg'}')" onclick="closeModal('exhibitionDetailModal'); showDetail(${JSON.stringify(a).replace(/"/g, '&quot;')})"></div>
            `).join('');
        } else {
            artifactsHtml += '<p>No artifacts linked to this exhibition yet.</p>';
        }
        artifactsHtml += '</div>';

        body.innerHTML = `
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px;">
                <div>
                    <p><strong>Museum:</strong> ${e.museum_name}</p>
                    <p><strong>Dates:</strong> ${new Date(e.start_date).toLocaleDateString()} - ${new Date(e.end_date).toLocaleDateString()}</p>
                    <h4 style="margin-bottom: 10px; margin-top: 20px;">Featured Artifacts</h4>
                    ${artifactsHtml}
                </div>
                <div style="border-left: 1px solid var(--glass-border); padding-left: 20px;">
                    <h4 style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                        <span>Visitor Feedback</span>
                        ${role === 'viewer' ? `<button class="btn-primary" style="padding: 5px 10px; font-size: 0.75rem; width: auto;" onclick="closeModal('exhibitionDetailModal'); openFeedbackModal(${e.exhibition_id}, '${e.name.replace(/'/g, "\\'")}')">WRITE REVIEW</button>` : ''}
                    </h4>
                    ${feedbackHtml}
                </div>
            </div>
        `;
        openModal('exhibitionDetailModal');
    } catch (err) {
        showToast('Error loading exhibition details', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteExhibition(id) {
    if (!confirm('Are you sure you want to delete this exhibition?')) return;

    try {
        const res = await fetch(`${API_URL}/exhibitions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showToast('Exhibition deleted');
            loadExhibitions();
        } else {
            const err = await res.json();
            showToast(err.message || 'Failed to delete exhibition', 'error');
        }
    } catch (err) {
        showToast('Server error', 'error');
    }
}

// ─────────────────────────────────────────
// MUSEUM FUNCTIONS
// ─────────────────────────────────────────

async function loadMuseums() {
    try {
        const res = await fetch(`${API_URL}/museums`);
        const museums = await res.json();
        const grid = document.getElementById('museumGrid');
        if (!grid || !Array.isArray(museums)) return;

        grid.innerHTML = '';
        museums.forEach((m, index) => {
            const card = document.createElement('div');
            card.className = 'artifact-card glass fade-in museum-card';
            card.style.animationDelay = `${index * 0.05}s`;
            card.onclick = () => showMuseumDetail(m);

            const adminBtns = role === 'admin' ? `
                <div style="display:flex; gap:8px; margin-top:14px;">
                    <button class="btn-primary" style="background:rgba(124,58,237,0.25);color:#a78bfa;border:1px solid #7c3aed;padding:5px 12px;font-size:0.75rem;width:auto;"
                        onclick="event.stopPropagation(); prepareEditMuseum(${JSON.stringify(m).replace(/"/g, '&quot;')})">EDIT</button>
                    <button class="btn-primary" style="background:rgba(255,77,77,0.15);color:#ff4d4d;border:1px solid #ff4d4d;padding:5px 12px;font-size:0.75rem;width:auto;"
                        onclick="event.stopPropagation(); deleteMuseum(${m.museum_id}, '${m.name.replace(/'/g, "\\'")}')">DELETE</button>
                </div>` : '';

            card.innerHTML = `
                <div class="museum-card-header">
                    <span class="museum-icon">🏛️</span>
                </div>
                <div class="artifact-info">
                    <h4 style="color:var(--accent);margin-bottom:10px;">${m.name}</h4>
                    <p><strong>Location:</strong> ${[m.city, m.state, m.country_name].filter(Boolean).join(', ') || 'N/A'}</p>
                    <p><strong>Established:</strong> ${m.year_established || 'Unknown'}</p>
                    ${adminBtns}
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading museums:', err);
    }
}

async function showMuseumDetail(m) {
    showLoading();
    try {
        const res = await fetch(`${API_URL}/museums/${m.museum_id}/artifacts`);
        const artifacts = await res.json();

        document.getElementById('museumDetailTitle').innerText = m.name;
        const body = document.getElementById('museumDetailBody');

        const location = [m.city, m.state, m.country_name].filter(Boolean).join(', ') || 'N/A';

        let artifactsHtml = '';
        if (Array.isArray(artifacts) && artifacts.length > 0) {
            artifactsHtml = `
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;">
                    ${artifacts.map(a => `
                        <div class="artifact-card glass" style="cursor:pointer;" onclick="closeModal('museumDetailModal');showDetail(${JSON.stringify(a).replace(/"/g, '&quot;')})">
                            <div class="artifact-img" style="height:110px;background-image:url('${API_URL.replace('/api', '')}${a.image_path || '/placeholder.jpg'}')"></div>
                            <div class="artifact-info" style="padding:10px;">
                                <h4 style="font-size:0.85rem;margin-bottom:4px;">${a.name}</h4>
                                <p style="font-size:0.75rem;color:var(--text-muted);">${a.age} yrs &bull; ${a.country_name || ''}</p>
                            </div>
                        </div>`).join('')}
                </div>`;
        } else {
            artifactsHtml = '<p style="color:var(--text-muted);">No artifacts currently housed in this museum.</p>';
        }

        const adminActions = role === 'admin' ? `
            <div style="display:flex;gap:10px;padding-top:10px;border-top:1px solid var(--glass-border);">
                <button class="btn-primary" style="background:#7c3aed;width:auto;padding:10px 20px;"
                    onclick="closeModal('museumDetailModal');prepareEditMuseum(${JSON.stringify(m).replace(/"/g, '&quot;')})">EDIT MUSEUM</button>
                <button class="btn-primary" style="background:#ff4d4d;width:auto;padding:10px 20px;"
                    onclick="closeModal('museumDetailModal');deleteMuseum(${m.museum_id}, '${m.name.replace(/'/g, "\\'")}')">DELETE MUSEUM</button>
            </div>` : '';

        body.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding-bottom:10px;border-bottom:1px solid var(--glass-border);">
                <div>
                    <p style="font-size:0.85rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Location</p>
                    <p style="font-size:1rem;">${location}</p>
                </div>
                <div>
                    <p style="font-size:0.85rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Year Established</p>
                    <p style="font-size:1rem;">${m.year_established || 'Unknown'}</p>
                </div>
            </div>
            <div>
                <h4 style="margin-bottom:14px;letter-spacing:1px;">HOUSED ARTIFACTS <span style="color:var(--text-muted);font-size:0.85rem;font-weight:400;">(${Array.isArray(artifacts) ? artifacts.length : 0})</span></h4>
                ${artifactsHtml}
            </div>
            ${adminActions}
        `;
        openModal('museumDetailModal');
    } catch (err) {
        showToast('Error loading museum details', 'error');
    } finally {
        hideLoading();
    }
}

function prepareEditMuseum(m) {
    closeModal('museumDetailModal');
    openModal('museumModal');
    document.getElementById('museumModalTitle').innerText = 'Edit Museum';
    const form = document.getElementById('museumForm');
    form.name.value = m.name || '';
    form.city.value = m.city || '';
    form.state.value = m.state || '';
    form.year_established.value = m.year_established || '';
    form.country_id.value = m.country_id || '';
    document.getElementById('editMuseumId').value = m.museum_id;
}

async function deleteMuseum(id, name) {
    if (!confirm(`Delete museum "${name}"? This cannot be undone.`)) return;
    showLoading();
    try {
        const res = await fetch(`${API_URL}/museums/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast(`"${name}" deleted successfully`);
            loadMuseums();
            // Refresh dropdowns since museums changed
            loadFilters();
        } else {
            const err = await res.json();
            showToast(err.message || 'Failed to delete museum', 'error');
        }
    } catch (err) {
        showToast('Server connection error', 'error');
    } finally {
        hideLoading();
    }
}

async function loadSuggestionMuseums() {
    try {
        const res = await fetch(`${API_URL}/misc/museums`);
        const museums = await res.json();
        const select = document.getElementById('suggestionMuseum');
        if (select) {
            select.innerHTML = '<option value="">-- No Specific Museum --</option>' +
                museums.map(m => `<option value="${m.museum_id}">${m.name}</option>`).join('');
        }
    } catch (err) {
        console.error('Error loading suggestion museums:', err);
    }
}

async function loadSuggestions() {
    const list = document.getElementById('suggestionsList');
    if (!list) return;

    try {
        const res = await fetch(`${API_URL}/suggestions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const suggestions = await res.json();

        if (suggestions.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No suggestions yet.</p>';
            return;
        }

        list.innerHTML = suggestions.map(s => `
            <div class="suggestion-card fade-in">
                <div class="suggestion-content">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span class="badge" style="background: var(--accent); color: #000; font-weight: bold;">${s.type.toUpperCase()}</span>
                        <h4 style="margin: 0; color: var(--accent)">${s.title}</h4>
                    </div>
                    <p style="margin: 5px 0; font-size: 0.95rem;">${s.description || 'No description provided.'}</p>
                    <div class="suggestion-meta">
                        <span>Suggested by: <strong>${s.suggested_by_name || 'Unknown'}</strong></span>
                        <span style="margin: 0 10px;">|</span>
                        <span>Museum: <strong>${s.museum_name || 'N/A'}</strong></span>
                        <span style="margin: 0 10px;">|</span>
                        <span>Date: ${new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="suggestion-actions">
                    ${s.status === 'pending' ? `
                        <button class="btn-primary" style="background: #34d399; width: auto; padding: 8px 15px; font-size: 0.75rem;" onclick='reviewAndAddSuggestion(${JSON.stringify(s).replace(/"/g, "&quot;")})'>REVIEW & ADD</button>
                        <button class="btn-primary" style="background: #f87171; width: auto; padding: 8px 15px; font-size: 0.75rem;" onclick="updateSuggestionStatus(${s.suggestion_id}, 'rejected')">REJECT</button>
                    ` : `
                        <span class="status-badge status-${s.status}">${s.status}</span>
                    `}
                </div>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = '<p style="text-align: center; color: #ff4d4d;">Failed to load suggestions.</p>';
    }
}

async function updateSuggestionStatus(id, status) {
    try {
        const res = await fetch(`${API_URL}/suggestions/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (res.ok) {
            showToast(`Suggestion ${status}!`);
            loadSuggestions();
        } else {
            showToast('Failed to update status', 'error');
        }
    } catch (err) {
        showToast('Server error', 'error');
    }
}

function reviewAndAddSuggestion(s) {
    pendingSuggestionId = s.suggestion_id;
    closeModal('reviewModal');

    if (s.type === 'artifact') {
        openModal('artifactModal', true);
        const form = document.getElementById('artifactForm');
        form.name.value = s.title;
        form.description.value = s.description || '';
        if (s.museum_id) form.museum_id.value = s.museum_id;
    } else if (s.type === 'exhibition') {
        openModal('exhibitionModal', true);
        const form = document.getElementById('exhibitionForm');
        form.name.value = s.title;
        if (s.museum_id) form.museum_id.value = s.museum_id;
    }
}

function attachEventListeners() {
    document.getElementById('artifactForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        const formData = new FormData(e.target);
        const editId = document.getElementById('editArtifactId').value;

        const materialsStr = formData.get('materials');
        if (materialsStr) {
            const mats = materialsStr.split(',').map(m => m.trim());
            formData.set('materials', JSON.stringify(mats));
        }

        const url = editId ? `${API_URL}/artifacts/${editId}` : `${API_URL}/artifacts`;
        const method = editId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                showToast(editId ? 'Artifact updated!' : 'Artifact added successfully!');
                closeModal('artifactModal');
                loadArtifacts();
                if (pendingSuggestionId && !editId) {
                    updateSuggestionStatus(pendingSuggestionId, 'approved');
                    pendingSuggestionId = null;
                }
                e.target.reset();
            } else {
                let errMsg = 'Failed to save artifact';
                try {
                    const err = await res.json();
                    errMsg = err.message || errMsg;
                } catch(e) {
                    errMsg = `HTTP Error: ${res.status}`;
                }
                showToast(errMsg, 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Server connection error', 'error');
        } finally {
            hideLoading();
        }
    });

    document.getElementById('exhibitionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const select = document.getElementById('exArtifacts');
        if (select) {
            data.artifact_ids = Array.from(select.selectedOptions).map(option => option.value);
        }

        try {
            const res = await fetch(`${API_URL}/exhibitions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showToast('Exhibition created!');
                closeModal('exhibitionModal');
                loadExhibitions();
                if (pendingSuggestionId) {
                    updateSuggestionStatus(pendingSuggestionId, 'approved');
                    pendingSuggestionId = null;
                }
                e.target.reset();
            } else {
                showToast('Failed to create exhibition', 'error');
            }
        } catch (err) {
            showToast('Server error', 'error');
        } finally {
            hideLoading();
        }
    });

    document.getElementById('userForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (res.ok) {
                showToast('User created successfully!');
                closeModal('userModal');
                e.target.reset();
            } else {
                showToast(result.message || 'Failed to create user', 'error');
            }
        } catch (err) {
            showToast('Server connection error', 'error');
        } finally {
            hideLoading();
        }
    });

    document.getElementById('applyFilters')?.addEventListener('click', loadArtifacts);
    document.getElementById('searchBar')?.addEventListener('input', loadArtifacts);
    document.getElementById('sortArtifacts')?.addEventListener('change', loadArtifacts);
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    document.getElementById('museumForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const editId = data.id;
        delete data.id;

        const url = editId ? `${API_URL}/museums/${editId}` : `${API_URL}/museums`;
        const method = editId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showToast(editId ? 'Museum updated!' : 'Museum added successfully!');
                closeModal('museumModal');
                loadMuseums();
                loadFilters(); // refresh museum dropdowns everywhere
                e.target.reset();
            } else {
                let errMsg = 'Failed to save museum';
                try {
                    const err = await res.json();
                    errMsg = err.message || errMsg;
                } catch(e) {
                    errMsg = `HTTP Error: ${res.status}`;
                }
                showToast(errMsg, 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Server connection error', 'error');
        } finally {
            hideLoading();
        }
    });

    document.getElementById('suggestionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch(`${API_URL}/suggestions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showToast('Suggestion submitted! Thank you.');
                closeModal('suggestionModal');
                e.target.reset();
            } else {
                let errMsg = 'Failed to submit suggestion';
                try {
                    const err = await res.json();
                    errMsg = err.message || errMsg;
                } catch(e) {
                    errMsg = `HTTP Error: ${res.status}`;
                }
                showToast(errMsg, 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Server connection error', 'error');
        } finally {
            hideLoading();
        }
    });

    document.getElementById('feedbackForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();

        const exhibitionId = document.getElementById('feedbackExhibitionId').value;
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.rating = parseInt(data.rating, 10);

        try {
            const res = await fetch(`${API_URL}/exhibitions/${exhibitionId}/feedback`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showToast('Feedback submitted successfully!');
                closeModal('feedbackModal');
                loadExhibitions();
            } else {
                let errMsg = 'Failed to submit feedback';
                try {
                    const err = await res.json();
                    errMsg = err.message || errMsg;
                } catch(e) {
                    errMsg = `HTTP Error: ${res.status}`;
                }
                showToast(errMsg, 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Server connection error', 'error');
        } finally {
            hideLoading();
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (e) {
            console.error('Logout request failed', e);
        }
        localStorage.clear();
        window.location.href = 'index.html';
    });
}
