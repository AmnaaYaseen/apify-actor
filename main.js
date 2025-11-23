// ====================
// MAIN.JS - Company Finder Actor
// ====================

import { Actor } from 'apify';
import { PuppeteerCrawler } from 'crawlee';

// Initialize the Actor
await Actor.init();

// Get input from Apify platform
const input = await Actor.getInput() || {};
const {
    industry = 'Technology',
    location = 'New York',
    maxResults = 20,
    proxyConfiguration = { useApifyProxy: true }
} = input;

console.log(`Searching for ${industry} companies in ${location}...`);

// Ensure minimum 10 results
const targetResults = Math.max(maxResults, 10);

// Company data schema
const createCompanyObject = () => ({
    companyName: null,
    domain: null,
    location: null,
    industry: industry,
    scrapedAt: new Date().toISOString()
});

// ====================
// EXTRACTION FUNCTIONS
// ====================

async function extractCompaniesFromGoogleMaps(page, searchQuery) {
    try {
        // Navigate to Google Maps search
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
        console.log(`Searching: ${searchUrl}`);
        
        await page.goto(searchUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
        });

        // Wait for results to load
        await page.waitForTimeout(4000);

        // Scroll to load more results
        await autoScroll(page);
        await page.waitForTimeout(2000);

        // Extract company data with improved selectors
        const companies = await page.evaluate(() => {
            const results = [];
            const businessCards = document.querySelectorAll('[role="article"]');
            
            businessCards.forEach((card) => {
                try {
                    // Extract company name - try multiple selectors
                    let companyName = null;
                    const nameSelectors = [
                        'div[font-weight="500"]',
                        'div[font-weight="600"]',
                        'h3',
                        '[data-value="Directions"]',
                        'div[class*="fontHeadline"]'
                    ];
                    
                    for (const selector of nameSelectors) {
                        const element = card.querySelector(selector);
                        if (element && element.textContent && element.textContent.trim()) {
                            companyName = element.textContent.trim();
                            break;
                        }
                    }
                    
                    if (!companyName) return;

                    // Extract address/location - try multiple methods
                    let address = null;
                    const addressSelectors = [
                        'button[data-value="Directions"]',
                        'span[aria-label*="Address"]',
                        'div[class*="fontBodyMedium"]'
                    ];
                    
                    for (const selector of addressSelectors) {
                        const element = card.querySelector(selector);
                        if (element) {
                            const text = element.textContent || element.getAttribute('aria-label') || '';
                            if (text.includes(',') || text.match(/\d+/)) {
                                address = text.trim();
                                break;
                            }
                        }
                    }

                    // Try to find website link in the card
                    let website = null;
                    const links = card.querySelectorAll('a[href]');
                    for (const link of links) {
                        const href = link.getAttribute('href');
                        if (href) {
                            // Check for website links
                            if (href.startsWith('http://') || href.startsWith('https://')) {
                                try {
                                    const url = new URL(href);
                                    const hostname = url.hostname.toLowerCase();
                                    if (!hostname.includes('google.com') && 
                                        !hostname.includes('maps.google') &&
                                        !hostname.includes('gstatic.com')) {
                                        website = hostname.replace('www.', '');
                                        break;
                                    }
                                } catch (e) {
                                    // Invalid URL, skip
                                }
                            }
                            // Check for /url?q= pattern (Google redirects)
                            else if (href.includes('/url?q=')) {
                                try {
                                    const urlParams = new URLSearchParams(href.split('?')[1]);
                                    const actualUrl = urlParams.get('q');
                                    if (actualUrl) {
                                        const url = new URL(actualUrl);
                                        const hostname = url.hostname.toLowerCase();
                                        if (!hostname.includes('google.com') && 
                                            !hostname.includes('maps.google')) {
                                            website = hostname.replace('www.', '');
                                            break;
                                        }
                                    }
                                } catch (e) {
                                    // Invalid URL, skip
                                }
                            }
                        }
                    }

                    if (companyName && companyName.length > 1) {
                        results.push({
                            companyName,
                            domain: website,
                            location: address
                        });
                    }
                } catch (error) {
                    // Skip this card if there's an error
                }
            });

            return results;
        });

        return companies;
    } catch (error) {
        console.error('Error extracting companies:', error.message);
        return [];
    }
}

// Alternative method: Extract from search results page
async function extractFromSearchResults(page, searchQuery) {
    try {
        // Try Google Search as alternative
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' companies')}`;
        console.log(`Trying Google Search: ${searchUrl}`);
        
        await page.goto(searchUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
        });

        await page.waitForTimeout(2000);

        const companies = await page.evaluate(() => {
            const results = [];
            
            // Extract from search results
            const searchResults = document.querySelectorAll('div[data-ved] h3, .g h3');
            
            searchResults.forEach((heading, index) => {
                if (index >= 30) return; // Limit results
                
                const companyName = heading.textContent.trim();
                const parent = heading.closest('.g') || heading.parentElement;
                
                if (!parent) return;

                // Try to find website
                const link = parent.querySelector('a[href]');
                let domain = null;
                if (link) {
                    let href = link.getAttribute('href');
                    
                    // Handle Google redirect URLs
                    if (href && href.includes('/url?q=')) {
                        try {
                            const urlParams = new URLSearchParams(href.split('?')[1]);
                            href = urlParams.get('q');
                        } catch (e) {}
                    }
                    
                    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                        try {
                            const url = new URL(href);
                            const hostname = url.hostname.toLowerCase();
                            // Filter out Google and social media domains
                            if (!hostname.includes('google.com') && 
                                !hostname.includes('youtube.com') &&
                                !hostname.includes('facebook.com') &&
                                !hostname.includes('linkedin.com') &&
                                !hostname.includes('twitter.com')) {
                                domain = hostname.replace('www.', '');
                            }
                        } catch (e) {
                            // Invalid URL
                        }
                    }
                }

                // Try to find location in snippet or visible text
                const snippet = parent.querySelector('.VwiC3b, .s, .IsZvec')?.textContent || '';
                const visibleText = parent.textContent || '';
                const fullText = snippet + ' ' + visibleText;
                
                // Look for location patterns
                let location = null;
                const locationPatterns = [
                    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2,})/,
                    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+)/,
                    /(located in|based in|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
                ];
                
                for (const pattern of locationPatterns) {
                    const match = fullText.match(pattern);
                    if (match) {
                        location = match[1] || match[2];
                        break;
                    }
                }

                // Include company even if domain is not found
                if (companyName && companyName.length > 1) {
                    results.push({
                        companyName,
                        domain: domain || null,
                        location: location || null
                    });
                }
            });

            return results;
        });

        return companies;
    } catch (error) {
        console.error('Error in search results extraction:', error.message);
        return [];
    }
}

// Auto-scroll function to load more results
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight || totalHeight >= 5000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
}

// Get domain from company name (fallback method)
function extractDomainFromName(companyName) {
    if (!companyName) return null;
    
    // Simple domain extraction - remove common suffixes and format
    const cleanName = companyName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .substring(0, 30);
    
    // This is a fallback - real domain extraction should come from scraping
    return null; // We'll rely on actual scraping
}

// Add randomization to get different results
function addRandomization(query) {
    const randomTerms = [
        'best', 'top', 'leading', 'premier', 'reliable',
        'established', 'professional', 'trusted', 'quality',
        'popular', 'famous', 'well-known', 'reputable', 'successful'
    ];
    const randomTerm = randomTerms[Math.floor(Math.random() * randomTerms.length)];
    
    // Also randomize the query structure
    const structures = [
        `${randomTerm} ${query}`,
        `${query} ${randomTerm}`,
        `${query} companies`,
        `${query} businesses`,
        `${query} firms`
    ];
    
    return structures[Math.floor(Math.random() * structures.length)];
}

// ====================
// MAIN CRAWLER
// ====================

const proxyConfig = await Actor.createProxyConfiguration(proxyConfiguration);

// Build search queries with randomization for variety
const baseQueries = [
    `${industry} companies in ${location}`,
    `${industry} businesses in ${location}`,
    `${industry} firms in ${location}`,
    `${industry} in ${location}`,
    `${location} ${industry} companies`
];

const allCompanies = [];
const seenDomains = new Set();
const seenNames = new Set();

// Helper function to process and deduplicate companies
function processCompanies(companies, location) {
    const processed = [];
    
    for (const company of companies) {
        if (allCompanies.length >= targetResults) break;

        const companyName = company.companyName?.trim();
        if (!companyName || companyName.length < 2) continue;
        
        const domain = company.domain?.trim() || null;
        const companyLocation = company.location?.trim() || location;

        // Skip duplicates by name (case-insensitive)
        const nameKey = companyName.toLowerCase();
        if (seenNames.has(nameKey)) continue;
        
        // Skip duplicates by domain if domain exists
        if (domain) {
            const domainKey = domain.toLowerCase();
            if (seenDomains.has(domainKey)) continue;
            seenDomains.add(domainKey);
        }

        seenNames.add(nameKey);

        const companyData = createCompanyObject();
        companyData.companyName = companyName;
        companyData.domain = domain || 'N/A';
        companyData.location = companyLocation;

        processed.push(companyData);
        allCompanies.push(companyData);
    }
    
    return processed;
}

const crawler = new PuppeteerCrawler({
    proxyConfiguration: proxyConfig,
    
    async requestHandler({ request, page }) {
        console.log(`Processing: ${request.url}`);
        
        try {
            // Extract search query from URL
            const urlObj = new URL(request.url);
            let searchQuery = '';
            
            if (urlObj.hostname.includes('maps.google.com')) {
                searchQuery = decodeURIComponent(urlObj.pathname.replace('/maps/search/', ''));
            } else if (urlObj.hostname.includes('google.com')) {
                searchQuery = urlObj.searchParams.get('q') || '';
            }
            
            console.log(`Extracting companies for query: ${searchQuery}`);
            
            let companies = [];
            
            // Method 1: Try Google Maps first
            if (urlObj.hostname.includes('maps.google.com')) {
                companies = await extractCompaniesFromGoogleMaps(page, searchQuery);
                console.log(`Found ${companies.length} companies from Google Maps`);
            }
            
            // Method 2: Try Google Search (always try as backup or if Maps didn't work)
            if (companies.length < targetResults || urlObj.hostname.includes('google.com')) {
                console.log(`Trying Google Search for more results...`);
                const searchCompanies = await extractFromSearchResults(page, searchQuery);
                console.log(`Found ${searchCompanies.length} companies from Google Search`);
                companies = [...companies, ...searchCompanies];
            }

            // Process and save companies
            const processed = processCompanies(companies, location);
            
            // Save to dataset
            for (const companyData of processed) {
                await Actor.pushData(companyData);
            }

            console.log(`Total unique companies found: ${allCompanies.length}/${targetResults}`);

        } catch (error) {
            console.error(`Error processing ${request.url}:`, error.message);
        }
    },

    failedRequestHandler({ request, error }) {
        console.error(`Request ${request.url} failed:`, error.message);
    },

    maxConcurrency: 1, // Single request for stability
    requestHandlerTimeoutSecs: 90,
});

// Try multiple search queries to get variety and enough results
const searchUrls = [];

// Add randomized base queries
for (const baseQuery of baseQueries) {
    const randomizedQuery = addRandomization(baseQuery);
    searchUrls.push(`https://www.google.com/maps/search/${encodeURIComponent(randomizedQuery)}`);
}

// Also add some Google Search URLs for variety
for (let i = 0; i < 2; i++) {
    const baseQuery = baseQueries[Math.floor(Math.random() * baseQueries.length)];
    const randomizedQuery = addRandomization(baseQuery);
    searchUrls.push(`https://www.google.com/search?q=${encodeURIComponent(randomizedQuery)}`);
}

console.log(`\nStarting search with ${searchUrls.length} different queries for variety...\n`);

// Run crawler with all search URLs
for (const searchUrl of searchUrls) {
    if (allCompanies.length >= targetResults) {
        console.log(`\n✓ Reached target of ${targetResults} companies!`);
        break;
    }
    
    await crawler.run([searchUrl]);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Small delay between searches
}

console.log(`\n✓ Company search completed!`);
console.log(`Total companies found: ${allCompanies.length}`);
console.log(`Target was: ${targetResults}`);

if (allCompanies.length < 10) {
    console.warn(`⚠ Warning: Only found ${allCompanies.length} companies. Minimum requirement is 10.`);
}

await Actor.exit();
