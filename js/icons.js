/**
 * ICONS.JS
 * Local SVG definitions to replace remote Phosphor Icons due to CSP.
 */

export const ICONS = {
    // Lasso Grid Icon
    'ph-lasso': `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M200,56H168a8,8,0,0,0,0,16h32V104a8,8,0,0,0,16,0V56A16,16,0,0,0,200,56ZM56,168H24V200a16,16,0,0,0,16,16H72a8,8,0,0,0,0-16H40V168A8,8,0,0,0,56,168Zm160-16a8,8,0,0,0-8,8v32a8,8,0,0,0,8,8h32a8,8,0,0,0,8-8V160a8,8,0,0,0-8-8ZM40,56V88a8,8,0,0,0,16,0V56H88a8,8,0,0,0,0-16H56A16,16,0,0,0,40,56Zm48,40h80a16,16,0,0,1,16,16v32a16,16,0,0,1-16,16H88a16,16,0,0,1-16-16V112A16,16,0,0,1,88,96Zm0,16v32h80V112Z"></path></svg>`,
    
    // Magnifying Glass
    'ph-magnifying-glass': `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path></svg>`,
    
    // Squares (Group)
    'ph-squares-four': `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,48H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V168A16,16,0,0,0,104,152Zm0,64H56V168h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V168A16,16,0,0,0,200,152Zm0,64H152V168h48v48Z"></path></svg>`,
    
    // Refresh
    'ph-arrow-clockwise': `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-21.95-60.08l-15.1,15.1A8,8,0,0,0,192.62,96H232a8,8,0,0,0,8-8V47.38a8,8,0,0,0-13-6.22l-17.06,17.06A112,112,0,1,0,240,128a8,8,0,0,0-16,0Z"></path></svg>`,
    
    // Trash
    'ph-trash': `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>`
};

export function injectIcons() {
    console.log("Injecting Local SVGs...");
    document.querySelectorAll('i.ph').forEach(el => {
        // Get classes
        const classes = Array.from(el.classList);
        // Find 'ph-something'
        const iconClass = classes.find(c => c.startsWith('ph-') && c !== 'ph');
        
        if (iconClass && ICONS[iconClass]) {
            el.innerHTML = ICONS[iconClass];
            el.style.display = 'inline-flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            // Scale inner SVG
            const svg = el.querySelector('svg');
            if(svg) {
                svg.style.width = '100%';
                svg.style.height = '100%';
            }
        }
    });
}
