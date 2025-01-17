export function convertMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (minutes < 60) {
        return `${remainingMinutes}m`;
    } else if (minutes === 60) {
        return `${hours}h`;
    } else {
        return `${hours}h ${remainingMinutes}m`;
    }
}

export async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Funciones de validación de URLs
export function validateStreamingUrl(url) {
    if (!url) return false;
    
    const validDomains = ['hlswish.com', 'streamwish.to', 'cdnplaypro.com'];
    
    try {
        // Primero limpiamos la URL de caracteres no deseados al inicio
        let cleanUrl = url.trim();
        if (!/^https?:\/\//.test(cleanUrl)) {
            cleanUrl = 'https://' + cleanUrl.replace(/^[^a-zA-Z0-9]*/, '');
        }
        
        const urlObj = new URL(cleanUrl);
        const domain = urlObj.hostname;
        
        // Verificar si el dominio es válido
        if (!validDomains.includes(domain)) return false;
        
        // Verificar el formato de la ruta
        const pathRegex = /^\/[ed]\/[a-zA-Z0-9]{6,}$/;
        if (!pathRegex.test(urlObj.pathname)) return false;
        
        // Verificar que no tenga caracteres sospechosos
        const suspiciousPatterns = [
            /(.)\1{10,}/, // Caracteres repetidos
            /[^a-zA-Z0-9\/:.-]/, // Caracteres especiales no permitidos
            /\.{2,}/ // Múltiples puntos seguidos
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(cleanUrl))) {
            return false;
        }
        
        return true;
    } catch {
        return false;
    }
}

export function updateUrlValidation(input) {
    const url = input.value.trim();
    const inputContainer = input.closest('.input-container');
    const checkIcon = inputContainer.querySelector('.input-check-icon');
    
    if (!url) {
        checkIcon.style.display = 'none';
        checkIcon.className = 'fas input-check-icon';
        return;
    }
    
    checkIcon.style.display = 'inline-block';

    if (!validateStreamingUrl(url)) {
        checkIcon.className = 'fas fa-times input-check-icon invalid';
        checkIcon.style.color = '#f44336';
        return;
    }

    const container = input.closest('.season-modal-content');
    const duplicateEpisodes = checkUrlDuplicate(input, url, container);
    
    if (duplicateEpisodes && duplicateEpisodes.length > 0) {
        checkIcon.className = 'fas fa-exclamation-triangle input-check-icon duplicate';
        checkIcon.style.color = '#FFA500';
    } else {
        checkIcon.className = 'fas fa-check input-check-icon valid';
        checkIcon.style.color = '#4CAF50';
    }
}

function createWarningElement(container) {
    const warningMessage = document.createElement('div');
    warningMessage.className = 'warning-message';
    warningMessage.style.cssText = `
        color: #FFA500;
        font-size: 12px;
        margin-top: 4px;
        display: none;
    `;
    container.appendChild(warningMessage);
    return warningMessage;
}

export function checkUrlDuplicate(currentInput, currentUrl, container) {
    if (!currentUrl) return [];
    
    const inputs = container.querySelectorAll('input[type="url"]');
    const normalizedCurrentUrl = currentUrl.toLowerCase();
    const duplicateEpisodes = [];
    
    inputs.forEach(input => {
        if (input !== currentInput) {
            const url = input.value.trim();
            if (url && validateStreamingUrl(url) && url.toLowerCase() === normalizedCurrentUrl) {
                const episodeNumber = input.dataset.episode;
                duplicateEpisodes.push(`E${episodeNumber}`);
            }
        }
    });
    
    return duplicateEpisodes;
}

/**
 * Muestra una notificación toast
 * @param {string} message - El mensaje a mostrar
 * @param {string} type - El tipo de notificación ('success', 'error', 'warning', 'info')
 * @param {number} duration - Duración en milisegundos (por defecto 3000)
 */
export function showToast(message, type = 'success', duration = 3000) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}
