import { generateSeriesData } from './series.js';
import { generateMovieData } from './movies.js';
import { searchTMDB } from './search.js';
import { generateEpisodeInputs, getEpisodeUrls, clearEpisodeUrls, clearValidationState } from './episodeInputs.js';
import { fetchSerieData, fetchMovieData } from './tmdbApi.js';
import { updateUrlValidation, validateStreamingUrl, showToast } from './utils.js';
import { CodeEditor } from './editor.js';

let isSerie = document.getElementById('serie');
let isMovie = document.getElementById('movie');
let types = document.querySelectorAll('input[type=radio][name=type]');
let selectedSerieKey = null;

// Event listeners para el cambio de tipo
types.forEach(type => {
    type.addEventListener('change', () => {
        const query = document.getElementById('search-query').value;
        if (query.length > 2) {
            buscar(query);
        }
    });
});

// Restauramos la función seleccionar
async function seleccionar(id) {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.add('show');
    const movieUrlsContainer = document.getElementById('movie-urls');

    try {
        // Limpiar el estado anterior y el estado de validación
        clearPreviousState();
        clearValidationState(); // Nueva función importada de episodeInputs.js
        
        selectedSerieKey = id;
        const languaje = "es-MX";

        if (isSerie.checked) {
            const serieData = await fetchSerieData(id, languaje);
            const regularSeasons = serieData.seasons.filter(season => season.season_number > 0);
            await generateEpisodeInputs(id, serieData.seasons, languaje, serieData.name);
            document.getElementById('temps').style.display = 'block';
            movieUrlsContainer.style.display = 'none';
            
            // Actualizar la información de la serie en la UI
            updateUIInfo(serieData.poster_path, serieData.name, 
                `${regularSeasons.length} ${regularSeasons.length === 1 ? "Temporada" : "Temporadas"}`, 
                serieData.first_air_date);
        } else {
            const movieData = await fetchMovieData(id, languaje);
            document.getElementById('temps').style.display = 'none';
            movieUrlsContainer.style.display = 'block';
            
            // Limpiar los inputs de película
            document.querySelectorAll('#movie-urls input[type="url"]').forEach(input => {
                input.value = '';
                const checkIcon = input.nextElementSibling;
                if (checkIcon) {
                    checkIcon.style.display = 'none';
                    checkIcon.className = 'fas input-check-icon';
                }
            });
            
            // Actualizar la información de la película en la UI
            updateUIInfo(movieData.poster_path, movieData.title, 'Película', movieData.release_date);
        }
        document.getElementById('search-results').style.display = 'none';
    } catch (error) {
        console.error('Error al seleccionar:', error);
    } finally {
        loadingScreen.classList.remove('show');
    }
}

// Función auxiliar para actualizar la UI
function updateUIInfo(posterPath, title, type, date) {
    document.getElementById('info-poster').setAttribute('src', `https://image.tmdb.org/t/p/w300/${posterPath}`);
    document.getElementById('info-title').innerText = title;
    document.getElementById('info-seasons').innerText = type;
    document.getElementById('info-year').innerText = date.slice(0, 4);
}

async function cargarPeliculas() {
    const serieKey = document.getElementById('numero').value;
    const languaje = "es-MX";

    try {
        if (isSerie.checked) {
            await generateSeriesData(serieKey, languaje);
        } else if (isMovie.checked) {
            await generateMovieData(serieKey, languaje);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

async function buscar(query) {
    const type = isSerie.checked ? 'tv' : 'movie';
    const languaje = "es-MX";

    try {
        const results = await searchTMDB(query, type, languaje);
        mostrarResultados(results);
    } catch (error) {
        console.error('Error searching data:', error);
    }
}

function mostrarResultados(results) {
    const resultsContainer = document.getElementById('search-results');
    if (results && results.length > 0) {
        resultsContainer.innerHTML = results.map(result => `
            <div class="result-item" onclick="seleccionar(${result.id})">
                <img src="${result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : 'img/no-image.png'}" alt="${result.name || result.title}" onerror="this.src='img/no-image.png';">
                <div class="result-info">
                    <h3>${result.name || result.title}</h3>
                    <p class="year">${(result.first_air_date || result.release_date || '').slice(0, 4)}</p>
                    <p class="overview">${result.overview ? result.overview.slice(0, 100) + '...' : 'No hay descripción disponible.'}</p>
                    <p class="tmdb-id">ID TMDB: ${result.id}</p>
                </div>
            </div>
        `).join('');
        resultsContainer.style.display = 'block';
    } else {
        resultsContainer.innerHTML = '<p class="no-results">No se encontraron resultados.</p>';
        resultsContainer.style.display = 'block';
    }
}

window.seleccionar = seleccionar; // Exponemos la función al ámbito global

// Add event listener for real-time search
document.getElementById('search-query').addEventListener('input', (event) => {
    const query = event.target.value;
    if (query.length > 2) { // Start searching after 3 characters
        buscar(query);
    } else {
        document.getElementById('search-results').innerHTML = ''; // Clear results if query is too short
    }
});

// Define the functions globally
window.generar = async function() {
    if (!selectedSerieKey) {
        console.error('No se ha seleccionado ningún contenido');
        return;
    }

    // Validar según el tipo de contenido
    if (isSerie.checked) {
        validateAndShowSeriesModal();
    } else if (isMovie.checked) {
        validateAndShowMovieModal();
    }
};

function validateAndShowSeriesModal() {
    // Mantener el código existente de validación de series
    const inputs = document.querySelectorAll('.season-modal input[type="url"]');
    let hasInvalidUrls = false;
    let hasEmptyInputs = false;
    let duplicateUrls = new Map();

    inputs.forEach(input => {
        const url = input.value.trim();
        if (url) {
            if (!validateStreamingUrl(url)) {
                hasInvalidUrls = true;
            } else {
                if (!duplicateUrls.has(url)) {
                    duplicateUrls.set(url, [{
                        season: input.dataset.season,
                        episode: input.dataset.episode
                    }]);
                } else {
                    duplicateUrls.get(url).push({
                        season: input.dataset.season,
                        episode: input.dataset.episode
                    });
                }
            }
        } else {
            hasEmptyInputs = true;
        }
    });

    const duplicates = Array.from(duplicateUrls.entries())
        .filter(([_, locations]) => locations.length > 1);

    if (hasInvalidUrls || hasEmptyInputs || duplicates.length > 0) {
        showValidationModal({
            invalidUrls: Array.from(inputs)
                .filter(input => input.value.trim() && !validateStreamingUrl(input.value.trim()))
                .map(input => ({
                    season: input.dataset.season,
                    episode: input.dataset.episode,
                    url: input.value.trim()
                })),
            emptyUrls: Array.from(inputs)
                .filter(input => !input.value.trim())
                .map(input => ({
                    season: input.dataset.season,
                    episode: input.dataset.episode
                })),
            duplicateUrls: duplicates.map(([url, locations]) => ({
                url,
                locations
            })),
            totalEpisodes: inputs.length,
            type: 'series'
        });
        return;
    }

    generateContent();
}

function validateAndShowMovieModal() {
    const movieInputs = document.querySelectorAll('#movie-urls input[type="url"]');
    let hasInvalidUrls = false;
    let hasEmptyInputs = false;
    let duplicateUrls = new Map();

    movieInputs.forEach(input => {
        const url = input.value.trim();
        if (url) {
            if (!validateStreamingUrl(url)) {
                hasInvalidUrls = true;
            } else {
                if (!duplicateUrls.has(url)) {
                    duplicateUrls.set(url, [{
                        option: input.dataset.option
                    }]);
                } else {
                    duplicateUrls.get(url).push({
                        option: input.dataset.option
                    });
                }
            }
        } else {
            hasEmptyInputs = true;
        }
    });

    const duplicates = Array.from(duplicateUrls.entries())
        .filter(([_, locations]) => locations.length > 1);

    if (hasInvalidUrls || hasEmptyInputs || duplicates.length > 0) {
        showValidationModal({
            invalidUrls: Array.from(movieInputs)
                .filter(input => input.value.trim() && !validateStreamingUrl(input.value.trim()))
                .map(input => ({
                    option: input.dataset.option,
                    url: input.value.trim()
                })),
            emptyUrls: Array.from(movieInputs)
                .filter(input => !input.value.trim())
                .map(input => ({
                    option: input.dataset.option
                })),
            duplicateUrls: duplicates.map(([url, locations]) => ({
                url,
                locations
            })),
            totalOptions: movieInputs.length,
            type: 'movie'
        });
        return;
    }

    generateContent();
}

function showValidationModal(results) {
    let modal = document.getElementById('validation-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'validation-modal';
        modal.className = 'validation-modal';
        document.body.appendChild(modal);
    }

    const isSeries = results.type === 'series';
    const itemName = isSeries ? 'episodio' : 'opción';

    modal.innerHTML = `
        <div class="modal-content">
            <h2>⚠️ ATENCIÓN: SE ENCONTRARON PROBLEMAS</h2>
            
            ${results.invalidUrls.length > 0 ? `
                <div class="validation-section error-section">
                    <h3>🚫 URLs INVÁLIDAS (${results.invalidUrls.length})</h3>
                    <p>Las siguientes URLs no son válidas y serán reemplazadas por la URL por defecto:</p>
                    <ul class="validation-list">
                        ${results.invalidUrls.map(item => 
                            isSeries ? 
                            `<li>Temporada ${item.season}, Episodio ${item.episode}: <span class="invalid-url">${item.url}</span></li>` :
                            `<li>Opción ${item.option}: <span class="invalid-url">${item.url}</span></li>`
                        ).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${results.duplicateUrls.length > 0 ? `
                <div class="validation-section duplicate-section">
                    <h3>🔄 URLs DUPLICADAS (${results.duplicateUrls.length})</h3>
                    <p>Se detectaron URLs que se repiten:</p>
                    <ul class="validation-list">
                        ${results.duplicateUrls.map(dup => `
                            <li>
                                <div class="duplicate-url">${dup.url}</div>
                                <div class="duplicate-locations">
                                    Repetida en: ${dup.locations.map(loc => 
                                        isSeries ? 
                                        `T${loc.season}E${loc.episode}` :
                                        `Opción ${loc.option}`
                                    ).join(' y ')}
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${results.emptyUrls.length > 0 ? `
                <div class="validation-section empty-section">
                    <h3>📝 ${isSeries ? 'EPISODIOS' : 'OPCIONES'} SIN URL (${results.emptyUrls.length})</h3>
                    <p>Los siguientes ${isSeries ? 'episodios' : 'opciones'} no tienen URL asignada:</p>
                    <ul class="validation-list">
                        ${results.emptyUrls.map(item =>
                            isSeries ? 
                            `<li>Temporada ${item.season}, Episodio ${item.episode}</li>` :
                            `<li>Opción ${item.option}</li>`
                        ).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div class="validation-summary">
                <p>Total de ${isSeries ? 'episodios' : 'opciones'}: ${isSeries ? results.totalEpisodes : results.totalOptions}</p>
                <div class="summary-notes">
                    <p class="note-title">📝 Notas importantes:</p>
                    <ul class="summary-list">
                        ${results.invalidUrls.length > 0 ? 
                            `<li>❌ Las URLs inválidas serán reemplazadas por la URL por defecto</li>` : ''}
                        ${results.duplicateUrls.length > 0 ? 
                            `<li>⚠️ Las URLs duplicadas podrían indicar un error de copia</li>` : ''}
                        ${results.emptyUrls.length > 0 ? 
                            `<li>ℹ️ Los ${itemName}s sin URL usarán la URL por defecto</li>` : ''}
                    </ul>
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn-continue">Continuar de todos modos</button>
                <button class="btn-cancel">Cancelar y revisar</button>
            </div>
        </div>
    `;

    modal.querySelector('.btn-continue').addEventListener('click', async () => {
        modal.style.display = 'none';
        await generateContent();
    });

    modal.querySelector('.btn-cancel').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.style.display = 'flex';
}

async function generateContent() {
    const languaje = "es-MX";
    const selectedLanguage = document.querySelector('input[name="language"]:checked').value;
    
    try {
        if (isSerie.checked) {
            await generateSeriesData(selectedSerieKey, languaje);
        } else {
            await generateMovieData(selectedSerieKey, languaje);
        }
        
        showToast('HTML generado con éxito', 'success');
        
    } catch (error) {
        console.error('Error generating content:', error);
        showToast('Error al generar el HTML', 'error');
    }
}

window.updateEpisodeUrl = function(input) {
    const season = parseInt(input.dataset.season);
    const episode = parseInt(input.dataset.episode);
    if (!episodeUrls[season]) {
        episodeUrls[season] = [];
    }
    episodeUrls[season][episode] = input.value;

    // Imprimir el array bidimensional en la consola
    console.log('Estado actual de episodeUrls:');
    episodeUrls.forEach((season, seasonIndex) => {
        if (season) {
            console.log(`Temporada ${seasonIndex}:`);
            season.forEach((url, episodeIndex) => {
                if (url) {
                    console.log(`  Episodio ${episodeIndex}: ${url}`);
                }
            });
        }
    });
};

async function handleSeriesSelection(serieKey, seasons, languaje) {
    await generateEpisodeInputs(serieKey, seasons, languaje);
    
    // Código de depuración
    console.log('Inputs generated');
    const inputs = document.querySelectorAll('input[type="url"]');
    console.log('Number of URL inputs found:', inputs.length);
    inputs.forEach(input => {
        console.log('Input:', input);
        input.addEventListener('input', function() {
            console.log('Input event triggered');
            updateEpisodeUrl(this);
        });
    });
}

// Agregar la función removeUrlValidation
function removeUrlValidation() {
    const movieInputs = document.querySelectorAll('#movie-urls input[type="url"]');
    movieInputs.forEach(input => {
        // Limpiar el valor del input
        input.value = '';
        
        // Resetear el ícono de validación si existe
        const checkIcon = input.nextElementSibling;
        if (checkIcon && checkIcon.classList.contains('input-check-icon')) {
            checkIcon.style.display = 'none';
            checkIcon.className = 'fas input-check-icon';
        }
        
        // Remover los event listeners
        input.removeEventListener('input', validateMovieUrl);
    });
}

// Al final del archivo, después de todas las otras funciones

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    const movieRadio = document.getElementById('movie');
    const serieRadio = document.getElementById('serie');
    const movieUrlsContainer = document.getElementById('movie-urls');

    // Ocultar inicialmente el contenedor de URLs de película
    movieUrlsContainer.style.display = 'none';

    setupUrlValidation();

    movieRadio.addEventListener('change', function() {
        if (this.checked && selectedSerieKey) { // Solo mostrar si hay una selección
            movieUrlsContainer.style.display = 'block';
            setupUrlValidation();
        } else {
            movieUrlsContainer.style.display = 'none';
        }
    });

    serieRadio.addEventListener('change', function() {
        if (this.checked) {
            movieUrlsContainer.style.display = 'none';
            removeUrlValidation();
        }
    });

    // Solo una instancia del editor
    window.editor = new CodeEditor();
    
    // Resto de las inicializaciones
    setupUrlValidation();
});

function setupUrlValidation() {
    const movieInputs = document.querySelectorAll('#movie-urls input[type="url"]');
    movieInputs.forEach(input => {
        input.removeEventListener('input', validateMovieUrl); // Remover listeners previos
        input.addEventListener('input', validateMovieUrl);
    });
}

function validateMovieUrl(event) {
    const input = event.target;
    let url = input.value.trim();
    const checkIcon = input.nextElementSibling;
    
    // Ocultar ícono si no hay URL
    if (!url) {
        checkIcon.style.display = 'none';
        checkIcon.className = 'fas input-check-icon';
        return;
    }
    
    checkIcon.style.display = 'inline-block';

    // Intentar limpiar y validar la URL
    try {
        // Si la URL no comienza con http(s), agregar https://
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url.replace(/^[^a-zA-Z0-9]*/, '');
            input.value = url; // Actualizar el input con la URL limpia
        }
        
        if (!validateStreamingUrl(url)) {
            checkIcon.className = 'fas fa-times input-check-icon invalid';
            checkIcon.style.color = '#f44336';
            return;
        }

        // Verificar duplicados
        const movieInputs = document.querySelectorAll('#movie-urls input[type="url"]');
        let isDuplicate = false;
        
        movieInputs.forEach(otherInput => {
            if (otherInput !== input && otherInput.value.trim() === url) {
                isDuplicate = true;
            }
        });

        if (isDuplicate) {
            checkIcon.className = 'fas fa-exclamation-triangle input-check-icon duplicate';
            checkIcon.style.color = '#FFA500';
        } else {
            checkIcon.className = 'fas fa-check input-check-icon valid';
            checkIcon.style.color = '#4CAF50';
        }
    } catch {
        checkIcon.className = 'fas fa-times input-check-icon invalid';
        checkIcon.style.color = '#f44336';
    }
}

// Asegurarse de que la validación se configure cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    setupUrlValidation();
});

function clearPreviousState() {
    // Limpiar el modal de validación si existe
    const existingModal = document.getElementById('validation-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Limpiar las URLs almacenadas para series
    if (typeof clearEpisodeUrls === 'function') {
        clearEpisodeUrls();
    }

    // Limpiar los inputs de película
    const movieInputs = document.querySelectorAll('#movie-urls input[type="url"]');
    movieInputs.forEach(input => {
        input.value = '';
        const checkIcon = input.nextElementSibling;
        if (checkIcon) {
            checkIcon.style.display = 'none';
            checkIcon.className = 'fas input-check-icon';
        }
    });

    // Limpiar el contenedor de temporadas
    const tempsContainer = document.getElementById('temps');
    if (tempsContainer) {
        tempsContainer.innerHTML = '';
    }

    // Limpiar el HTML final
    const htmlFinal = document.getElementById('html-final');
    if (htmlFinal) {
        htmlFinal.innerText = '';
    }
}

// Modificar la función donde se actualiza el HTML
export function updateHTML(content) {
    if (editor && editor.editor) {
        editor.setContent(content);
        // El formateo ahora se maneja automáticamente en setContent
    } else {
        console.error('Editor not initialized');
    }
}

// Modificar la función de copiar
window.copiarHTML = function() {
    if (editor && editor.editor) {
        const templateHTML = editor.getContent();
        navigator.clipboard.writeText(templateHTML).then(() => {
            showToast('HTML copiado al portapapeles', 'success');
        }).catch(() => {
            showToast('Error al copiar el HTML', 'error');
        });
    } else {
        showToast('Error: Editor no inicializado', 'error');
    }
}

// Hacer la función updateHTML disponible globalmente
window.updateHTML = function(content) {
    if (editor && editor.editor) {
        editor.setContent(content);
    } else {
        console.error('Editor not initialized');
    }
}
