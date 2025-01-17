import { fetchData } from 'https://cdn.jsdelivr.net/gh/Jplus15/Gdrive@main/utils.js';

const urlBase = 'https://api.themoviedb.org/3';
const apiKey = 'ef9d33cc91a9d46d9bcf364a274ced72';

/**
 * Search for movies or series using TMDB API.
 * @param {string} query - The search query.
 * @param {string} type - The type of search ('movie' or 'tv').
 * @param {string} languaje - The language parameter.
 * @returns {Promise<Array>} - The search results.
 */
export async function searchTMDB(query, type, languaje) {
    const languageParam = `language=${languaje}`;
    const url = `${urlBase}/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&${languageParam}`;
    const response = await fetchData(url);
    return response.results; // Return the results array
}
